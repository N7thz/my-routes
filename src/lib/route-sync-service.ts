import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodeNewStops } from "@/lib/geocode";
import { dayRange, todayKey } from "@/lib/dates";
import { getGoogleCalendarTokenForUser, type GoogleUnavailableReason } from "@/lib/google-auth";
import { eventStart, listCalendarEvents, type CalendarEvent } from "@/lib/google-calendar-service";
import { buildCandidates } from "@/lib/route-sync-match";
import {
  companiesOnDay,
  dayRouteName,
  stopFromCompany,
} from "@/lib/route-service";

// As sincronizações recebem `userId` explícito porque também rodam sem sessão
// (cron da Vercel).

/** Fuso da operação — as rotas são planejadas em horário local, não no do servidor. */
const APP_TIME_ZONE = "America/Sao_Paulo";

/** A rota do usuário naquele dia, criada (vazia) se ainda não existir. */
async function findOrCreateDayRoute(userId: string, day: string, nameDetail?: string) {
  const { start, end } = dayRange(day);
  const existing = await prisma.route.findFirst({
    where: { userId, date: { gte: start, lt: end } },
    include: { stops: true },
  });
  if (existing) return { route: existing, created: false };

  const route = await prisma.route.create({
    data: { userId, name: dayRouteName(day, nameDetail), date: start },
    include: { stops: true },
  });
  return { route, created: true };
}

function nextStopOrder(stops: { order: number }[]): number {
  return stops.reduce((max, s) => Math.max(max, s.order), -1) + 1;
}

export type RouteSyncResult = {
  daysWithCompanies: number;
  routesCreated: number;
  stopsAdded: number;
  days: string[];
  /** Rotas criadas ou com paradas mudadas nesta rodada (candidatas a reordenar). */
  changedRouteIds: string[];
};

/**
 * Cada dia, de hoje em diante, com empresa agendada (`Company.date`) vira uma
 * rota (criada se ainda não existe) com essas empresas como paradas.
 *
 * É idempotente: dedup por empresa dentro da rota do dia.
 */
export async function syncCompanyDatesToRoutes(userId: string): Promise<RouteSyncResult> {
  const today = todayKey(APP_TIME_ZONE);
  const scheduled = await prisma.company.findMany({
    where: { date: { gte: dayRange(today).start } },
    select: { date: true },
  });
  const days = [...new Set(scheduled.map((c) => (c.date as Date).toISOString().slice(0, 10)))].sort();

  const result: RouteSyncResult = {
    daysWithCompanies: days.length,
    routesCreated: 0,
    stopsAdded: 0,
    days: [],
    changedRouteIds: [],
  };
  const toGeocode: string[] = [];

  for (const day of days) {
    const companies = await companiesOnDay(day);
    if (companies.length === 0) continue;

    const { route, created } = await findOrCreateDayRoute(userId, day);
    if (created) result.routesCreated++;
    result.days.push(day);

    const existing = new Set(route.stops.map((s) => s.companyId));
    const toAdd = companies.filter((c) => !existing.has(c.id));
    if (created || toAdd.length > 0) result.changedRouteIds.push(route.id);
    if (toAdd.length === 0) continue;

    const firstOrder = nextStopOrder(route.stops);
    const added = await prisma.stop.createManyAndReturn({
      data: toAdd.map((company, i) => ({
        routeId: route.id,
        ...stopFromCompany(company),
        order: firstOrder + i,
      })),
      select: { id: true, lat: true },
    });
    result.stopsAdded += added.length;
    toGeocode.push(...added.filter((s) => s.lat === null).map((s) => s.id));
  }

  if (toGeocode.length > 0) after(() => geocodeNewStops(toGeocode));
  return result;
}

/** Janela olhada na agenda, a partir de hoje. */
const CALENDAR_DAYS_AHEAD = 30;
/** Teto de eventos por sincronização; se bater, a resposta pode estar truncada. */
const CALENDAR_MAX_EVENTS = 2500;

export type CalendarRouteSyncResult = {
  eventsConsidered: number;
  daysWithEvents: number;
  routesCreated: number;
  stopsAdded: number;
  stopsUpdated: number;
  stopsRemoved: number;
  days: string[];
  /** Rotas criadas ou com paradas mudadas nesta rodada (candidatas a reordenar). */
  changedRouteIds: string[];
};

export type CalendarRouteSyncOutcome =
  | ({ ok: true } & CalendarRouteSyncResult)
  | { ok: false; reason: GoogleUnavailableReason };

/**
 * Reflete os eventos do Google Agenda nas rotas dos próximos dias: cada dia com
 * evento vira uma rota (criada se não existir) e cada evento com destino vira
 * uma parada, casada com a empresa agendada para o dia quando o nome bate.
 *
 * Idempotente: a parada guarda o `calendarEventId`, então ressincronizar
 * atualiza em vez de duplicar. Paradas vindas da agenda que sumiram dela são
 * removidas — mas nunca as já visitadas nem as de outra origem (empresas agendadas,
 * manuais), que não têm `calendarEventId`.
 */
export async function syncCalendarEventsToRoutes(
  userId: string
): Promise<CalendarRouteSyncOutcome> {
  const token = await getGoogleCalendarTokenForUser(userId);
  if (!token.hasCalendarScope) return { ok: false, reason: token.reason };

  const today = todayKey(APP_TIME_ZONE);
  const from = dayRange(today).start;
  const until = new Date(from);
  until.setUTCDate(until.getUTCDate() + CALENDAR_DAYS_AHEAD);

  const events = await listCalendarEvents(token.accessToken, {
    timeMin: from.toISOString(),
    timeMax: until.toISOString(),
    maxResults: CALENDAR_MAX_EVENTS,
  });

  // Resposta possivelmente truncada: um evento ausente aqui não prova que ele
  // saiu da agenda, então não removemos nada nessa rodada.
  const truncated = events.length >= CALENDAR_MAX_EVENTS;

  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    if (event.status === "cancelled") continue;
    const day = eventStart(event).slice(0, 10);
    // `timeMin` em UTC pega algumas horas da noite anterior no fuso local.
    if (!day || day < today) continue;
    const list = byDay.get(day) ?? [];
    list.push(event);
    byDay.set(day, list);
  }

  const result: CalendarRouteSyncResult = {
    eventsConsidered: 0,
    daysWithEvents: byDay.size,
    routesCreated: 0,
    stopsAdded: 0,
    stopsUpdated: 0,
    stopsRemoved: 0,
    days: [],
    changedRouteIds: [],
  };
  const toGeocode: string[] = [];

  for (const day of [...byDay.keys()].sort()) {
    const dayEvents = byDay.get(day)!.sort((a, b) => eventStart(a).localeCompare(eventStart(b)));
    result.eventsConsidered += dayEvents.length;

    const candidates = buildCandidates(dayEvents, await companiesOnDay(day));
    if (candidates.length === 0) continue;

    const { route, created } = await findOrCreateDayRoute(userId, day);
    if (created) result.routesCreated++;
    result.days.push(day);

    const byEvent = new Map(
      route.stops.flatMap((s) => (s.calendarEventId ? [[s.calendarEventId, s] as const] : []))
    );
    const byCompany = new Map(
      route.stops.flatMap((s) => (s.companyId ? [[s.companyId, s] as const] : []))
    );
    let nextOrder = nextStopOrder(route.stops);
    const keptStopIds = new Set<string>();
    const changesBefore = result.stopsAdded + result.stopsUpdated + result.stopsRemoved;

    for (const candidate of candidates) {
      // Uma parada da rodada anterior (pelo evento) ou uma parada de outra
      // origem para a mesma empresa — nesse caso adotamos o evento nela.
      const existing =
        (candidate.calendarEventId ? byEvent.get(candidate.calendarEventId) : undefined) ??
        (candidate.companyId ? byCompany.get(candidate.companyId) : undefined);

      if (!existing) {
        const created = await prisma.stop.create({
          data: { routeId: route.id, ...candidate, order: nextOrder++ },
        });
        keptStopIds.add(created.id);
        if (created.lat === null) toGeocode.push(created.id);
        result.stopsAdded++;
        continue;
      }

      keptStopIds.add(existing.id);
      // Endereço novo sem ponto conhecido: o ponto antigo seria do lugar errado.
      const moved = candidate.address !== existing.address && candidate.lat == null;
      // Nunca apagamos o que já estava preenchido: a agenda só acrescenta.
      const next = {
        calendarEventId: candidate.calendarEventId ?? existing.calendarEventId,
        companyId: candidate.companyId ?? existing.companyId,
        label: candidate.label,
        address: candidate.address,
        lat: moved ? null : (candidate.lat ?? existing.lat),
        lng: moved ? null : (candidate.lng ?? existing.lng),
      };
      const changed = (Object.keys(next) as (keyof typeof next)[]).some(
        (key) => next[key] !== existing[key]
      );
      if (changed) {
        await prisma.stop.update({
          where: { id: existing.id },
          data: { ...next, ...(moved && { geocodeFailedAt: null }) },
        });
        if (next.lat === null) toGeocode.push(existing.id);
        result.stopsUpdated++;
      }
    }

    if (!truncated) {
      const stale = route.stops.filter(
        (s) => s.calendarEventId && !keptStopIds.has(s.id) && !s.visitedAt
      );
      if (stale.length > 0) {
        await prisma.stop.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
        result.stopsRemoved += stale.length;
      }
    }

    if (created || result.stopsAdded + result.stopsUpdated + result.stopsRemoved > changesBefore) {
      result.changedRouteIds.push(route.id);
    }
  }

  if (toGeocode.length > 0) after(() => geocodeNewStops(toGeocode));
  return { ok: true, ...result };
}
