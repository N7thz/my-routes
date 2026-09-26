import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllRunrunitTasks } from "@/lib/runrunit-service";
import { getGoogleCalendarTokenForUser } from "@/lib/google-auth";
import { listCalendarEvents, type CalendarEvent } from "@/lib/google-calendar-service";
import type { RouteStatus } from "../../prisma/generated/enums";

export type { RouteStatus };

/** Fuso da operação — as rotas são planejadas em horário local, não no do servidor. */
const APP_TIME_ZONE = "America/Sao_Paulo";

/** Hoje (YYYY-MM-DD) no fuso da operação. */
function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(new Date());
}

/** "26 de jul. de 2026" a partir de "2026-07-26" (meio-dia local evita borda de fuso). */
function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Intervalo [00:00, 24:00) UTC do dia — `Company.date`/`Route.date` são date-only. */
function dayRange(day: string): { start: Date; end: Date } {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export type StopRecord = {
  id: string;
  routeId: string;
  companyId: string | null;
  company: { id: string; name: string } | null;
  label: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  order: number;
  visitedAt: Date | null;
  createdAt: Date;
};

export type RouteRecord = {
  id: string;
  userId: string;
  name: string;
  date: Date | null;
  status: RouteStatus;
  stops: StopRecord[];
  createdAt: Date;
  updatedAt: Date;
};

const stopInclude = {
  include: { company: { select: { id: true, name: true } } },
} as const;

const routeInclude = {
  include: {
    stops: { orderBy: { order: "asc" as const }, ...stopInclude },
  },
} as const;

async function currentUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

export async function listRoutes(): Promise<RouteRecord[]> {
  const userId = await currentUserId();
  return prisma.route.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    ...routeInclude,
  });
}

export async function getRoute(id: string): Promise<RouteRecord | null> {
  const userId = await currentUserId();
  return prisma.route.findFirst({ where: { id, userId }, ...routeInclude });
}

export type RouteCreateInput = { name: string; date?: string | null };

export async function createRoute(data: RouteCreateInput): Promise<RouteRecord> {
  const userId = await currentUserId();
  return prisma.route.create({
    data: {
      userId,
      name: data.name,
      date: data.date ? new Date(data.date) : null,
    },
    ...routeInclude,
  });
}

/**
 * Cria uma rota (Rascunho) a partir das empresas cadastradas com a data informada,
 * cada empresa virando uma parada. Lança se não houver empresas nessa data.
 */
export async function generateRouteFromDate(dateIso: string): Promise<RouteRecord> {
  const userId = await currentUserId();

  // company.date é armazenada à meia-noite UTC; casamos o dia por intervalo.
  const { start, end } = dayRange(dateIso);

  const companies = await prisma.company.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true, lat: true, lng: true },
  });
  if (companies.length === 0) {
    throw new Error("Nenhuma empresa cadastrada nesta data");
  }

  return prisma.route.create({
    data: {
      userId,
      name: `Rota do dia ${dayLabel(dateIso)}`,
      date: start,
      stops: {
        create: companies.map((c, i) => ({
          companyId: c.id,
          label: c.name,
          address: c.address ?? "",
          lat: c.lat,
          lng: c.lng,
          order: i,
        })),
      },
    },
    ...routeInclude,
  });
}

export type RouteUpdateInput = {
  name?: string;
  date?: string | null;
  status?: RouteStatus;
};

export async function updateRoute(id: string, data: RouteUpdateInput): Promise<RouteRecord> {
  const userId = await currentUserId();
  return prisma.route.update({
    where: { id, userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.date !== undefined && { date: data.date ? new Date(data.date) : null }),
    },
    ...routeInclude,
  });
}

export async function deleteRoute(id: string): Promise<void> {
  const userId = await currentUserId();
  await prisma.route.delete({ where: { id, userId } });
}

export type StopCreateInput = {
  companyId?: string | null;
  label?: string | null;
  address: string;
  lat?: number | null;
  lng?: number | null;
};

async function assertRouteOwner(routeId: string, userId: string) {
  const route = await prisma.route.findFirst({ where: { id: routeId, userId } });
  if (!route) throw new Error("Rota não encontrada");
}

export async function addStop(routeId: string, data: StopCreateInput): Promise<StopRecord> {
  const userId = await currentUserId();
  await assertRouteOwner(routeId, userId);

  const last = await prisma.stop.findFirst({
    where: { routeId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return prisma.stop.create({
    data: {
      routeId,
      companyId: data.companyId ?? null,
      label: data.label ?? null,
      address: data.address,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      order: (last?.order ?? -1) + 1,
    },
    ...stopInclude,
  });
}

export async function removeStop(routeId: string, stopId: string): Promise<void> {
  const userId = await currentUserId();
  await assertRouteOwner(routeId, userId);
  await prisma.stop.delete({ where: { id: stopId, routeId } });
}

export async function markStopVisited(
  routeId: string,
  stopId: string,
  visited: boolean
): Promise<StopRecord> {
  const userId = await currentUserId();
  await assertRouteOwner(routeId, userId);
  return prisma.stop.update({
    where: { id: stopId, routeId },
    data: { visitedAt: visited ? new Date() : null },
    ...stopInclude,
  });
}

// --- Sincronização automática: tarefas futuras do Runrunit -> rota do dia ---

export type RouteSyncResult = {
  tasksConsidered: number;
  daysWithTasks: number;
  routesCreated: number;
  stopsAdded: number;
  days: string[];
};

/**
 * Verifica as tarefas futuras do Runrunit atribuídas a mim (via token global).
 * Cada dia que tem tarefa futura vira uma rota (criada se ainda não existe), e
 * as paradas são as empresas agendadas para esse mesmo dia (`Company.date`) —
 * o `client_name` da tarefa (cidade) serve apenas para nomear a rota nova.
 *
 * Recebe `userId` explícito porque roda sem sessão (ex.: cron da Vercel).
 * É idempotente: dedup por empresa dentro da rota do dia.
 */
export async function syncRunrunitTasksToRoutes(userId: string): Promise<RouteSyncResult> {
  const tasks = await getAllRunrunitTasks();

  const todayStr = todayKey();
  const future = tasks.filter(
    (t) => !t.is_closed && !!t.desired_date && t.desired_date.slice(0, 10) >= todayStr
  );

  // Agrupa dias com tarefa futura -> cidades (client_name) daquele dia.
  const dayCities = new Map<string, Set<string>>();
  for (const t of future) {
    const day = t.desired_date!.slice(0, 10);
    const cities = dayCities.get(day) ?? new Set<string>();
    if (t.client_name) cities.add(t.client_name);
    dayCities.set(day, cities);
  }

  const result: RouteSyncResult = {
    tasksConsidered: future.length,
    daysWithTasks: dayCities.size,
    routesCreated: 0,
    stopsAdded: 0,
    days: [],
  };
  if (dayCities.size === 0) return result;

  for (const [day, cities] of dayCities) {
    const { start, end } = dayRange(day);

    // Empresas agendadas para esse dia (mesma lógica de generateRouteFromDate).
    const companies = await prisma.company.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true, lat: true, lng: true },
    });
    if (companies.length === 0) continue; // dia sem empresas agendadas -> nada a fazer

    let route = await prisma.route.findFirst({
      where: { userId, date: { gte: start, lt: end } },
      include: { stops: { select: { companyId: true, order: true } } },
    });

    if (!route) {
      const label = dayLabel(day);
      const cityList = [...cities].join(", ");
      route = await prisma.route.create({
        data: {
          userId,
          name: cityList ? `Rota do dia ${label} · ${cityList}` : `Rota do dia ${label}`,
          date: start,
        },
        include: { stops: { select: { companyId: true, order: true } } },
      });
      result.routesCreated++;
    }
    result.days.push(day);

    const existing = new Set(route.stops.map((s) => s.companyId).filter(Boolean));
    const nextOrder = route.stops.reduce((m, s) => Math.max(m, s.order), -1) + 1;
    const toAdd = companies.filter((c) => !existing.has(c.id));

    if (toAdd.length > 0) {
      await prisma.stop.createMany({
        data: toAdd.map((c, i) => ({
          routeId: route!.id,
          companyId: c.id,
          label: c.name,
          address: c.address ?? "",
          lat: c.lat,
          lng: c.lng,
          order: nextOrder + i,
        })),
      });
      result.stopsAdded += toAdd.length;
    }
  }

  return result;
}

// --- Sincronização automática: eventos do Google Agenda -> rotas ---

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
};

export type CalendarRouteSyncOutcome =
  | ({ ok: true } & CalendarRouteSyncResult)
  | { ok: false; reason: "not-connected" | "no-calendar-scope" | "unauthenticated" };

type DayCompany = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

type StopCandidate = {
  calendarEventId: string | null;
  companyId: string | null;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

/**
 * Dia do evento. Tanto `date` quanto `dateTime` já vêm com a data pretendida nos
 * 10 primeiros caracteres (o `dateTime` traz o offset do próprio evento), então
 * fatiar evita a conversão de fuso que `new Date()` faria.
 */
function eventDayKey(event: CalendarEvent): string | null {
  const raw = event.start.dateTime ?? event.start.date;
  return raw ? raw.slice(0, 10) : null;
}

function eventSortKey(event: CalendarEvent): string {
  return event.start.dateTime ?? event.start.date ?? "";
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Casa o evento com uma das empresas agendadas para o dia comparando o nome
 * normalizado da empresa com o texto do evento (título + local). Nomes curtos
 * são ignorados para não gerar falso positivo; vence o nome mais longo.
 */
function matchCompany(event: CalendarEvent, companies: DayCompany[]): DayCompany | null {
  const haystack = normalizeText(`${event.summary ?? ""} ${event.location ?? ""}`);
  if (!haystack) return null;

  let best: DayCompany | null = null;
  for (const company of companies) {
    const needle = normalizeText(company.name);
    if (needle.length < 4 || !haystack.includes(needle)) continue;
    if (!best || needle.length > normalizeText(best.name).length) best = company;
  }
  return best;
}

/**
 * Paradas que o dia deveria ter: um item por evento com destino conhecido (na
 * ordem do horário), seguido das empresas agendadas para o dia que nenhum
 * evento citou — assim a agenda manda na ordem sem perder o que veio do Notion.
 */
function buildCandidates(events: CalendarEvent[], companies: DayCompany[]): StopCandidate[] {
  const candidates: StopCandidate[] = [];
  const usedCompanies = new Set<string>();

  for (const event of events) {
    const company = matchCompany(event, companies);
    // Empresa já coberta por um evento anterior do mesmo dia.
    if (company && usedCompanies.has(company.id)) continue;

    const address = company?.address?.trim() || event.location?.trim() || "";
    // Sem empresa e sem local não há para onde ir — o evento fica fora da rota.
    if (!address) continue;

    if (company) usedCompanies.add(company.id);
    candidates.push({
      calendarEventId: event.id,
      companyId: company?.id ?? null,
      label: event.summary?.trim() || company?.name || "Evento sem título",
      address,
      lat: company?.lat ?? null,
      lng: company?.lng ?? null,
    });
  }

  for (const company of companies) {
    const address = company.address?.trim();
    if (usedCompanies.has(company.id) || !address) continue;
    candidates.push({
      calendarEventId: null,
      companyId: company.id,
      label: company.name,
      address,
      lat: company.lat,
      lng: company.lng,
    });
  }

  return candidates;
}

/**
 * Reflete os eventos do Google Agenda nas rotas dos próximos dias: cada dia com
 * evento vira uma rota (criada se não existir) e cada evento com destino vira
 * uma parada, casada com a empresa agendada para o dia quando o nome bate.
 *
 * Idempotente: a parada guarda o `calendarEventId`, então ressincronizar
 * atualiza em vez de duplicar. Paradas vindas da agenda que sumiram dela são
 * removidas — mas nunca as já visitadas nem as de outra origem (Runrunit,
 * manuais), que não têm `calendarEventId`.
 *
 * Recebe `userId` explícito porque também roda sem sessão (cron da Vercel).
 */
export async function syncCalendarEventsToRoutes(
  userId: string
): Promise<CalendarRouteSyncOutcome> {
  const token = await getGoogleCalendarTokenForUser(userId);
  if (!token.hasCalendarScope) return { ok: false, reason: token.reason };

  const from = todayKey();
  const until = new Date(`${from}T00:00:00.000Z`);
  until.setUTCDate(until.getUTCDate() + CALENDAR_DAYS_AHEAD);

  const events = await listCalendarEvents(token.accessToken, {
    timeMin: `${from}T00:00:00.000Z`,
    timeMax: until.toISOString(),
    maxResults: CALENDAR_MAX_EVENTS,
  });

  // Resposta possivelmente truncada: um evento ausente aqui não prova que ele
  // saiu da agenda, então não removemos nada nessa rodada.
  const truncated = events.length >= CALENDAR_MAX_EVENTS;

  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    if (event.status === "cancelled") continue;
    const day = eventDayKey(event);
    // `timeMin` em UTC pega algumas horas da noite anterior no fuso local.
    if (!day || day < from) continue;
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
  };

  for (const day of [...byDay.keys()].sort()) {
    const dayEvents = byDay.get(day)!.sort((a, b) => eventSortKey(a).localeCompare(eventSortKey(b)));
    result.eventsConsidered += dayEvents.length;

    const { start, end } = dayRange(day);
    const companies = await prisma.company.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true, lat: true, lng: true },
    });

    const candidates = buildCandidates(dayEvents, companies);
    if (candidates.length === 0) continue;

    let route = await prisma.route.findFirst({
      where: { userId, date: { gte: start, lt: end } },
      include: { stops: true },
    });
    if (!route) {
      route = await prisma.route.create({
        data: { userId, name: `Rota do dia ${dayLabel(day)}`, date: start },
        include: { stops: true },
      });
      result.routesCreated++;
    }
    result.days.push(day);

    const byEvent = new Map(
      route.stops.flatMap((s) => (s.calendarEventId ? [[s.calendarEventId, s] as const] : []))
    );
    const byCompany = new Map(
      route.stops.flatMap((s) => (s.companyId ? [[s.companyId, s] as const] : []))
    );
    let nextOrder = route.stops.reduce((max, s) => Math.max(max, s.order), -1) + 1;
    const keptStopIds = new Set<string>();

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
        result.stopsAdded++;
        continue;
      }

      keptStopIds.add(existing.id);
      // Nunca apagamos o que já estava preenchido: a agenda só acrescenta.
      const next = {
        calendarEventId: candidate.calendarEventId ?? existing.calendarEventId,
        companyId: candidate.companyId ?? existing.companyId,
        label: candidate.label,
        address: candidate.address,
        lat: candidate.lat ?? existing.lat,
        lng: candidate.lng ?? existing.lng,
      };
      const changed = (Object.keys(next) as (keyof typeof next)[]).some(
        (key) => next[key] !== existing[key]
      );
      if (changed) {
        await prisma.stop.update({ where: { id: existing.id }, data: next });
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
  }

  return { ok: true, ...result };
}

/** Reordena as paradas: cada id recebe `order` = seu índice na lista. */
export async function reorderStops(routeId: string, orderedIds: string[]): Promise<void> {
  const userId = await currentUserId();
  await assertRouteOwner(routeId, userId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.stop.updateMany({ where: { id, routeId }, data: { order: index } })
    )
  );
}
