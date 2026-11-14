import "server-only";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/dates";
import { backfillCoordinates, geocodeAddress } from "@/lib/geocode";
import { syncCalendarEventsToRoutes, syncCompanyDatesToRoutes } from "@/lib/route-sync-service";
import { optimizeOrder } from "@/lib/route-optimize";

// Rota do dia automática: junta as fontes (empresas agendadas e Google Agenda) nas rotas
// dos próximos dias e reordena as paradas pelo melhor trajeto. Roda no cron
// diário para todos os usuários que ativaram e no botão "Gerar agora".

const APP_TIME_ZONE = "America/Sao_Paulo";

export type AutoRouteSettingsView = {
  enabled: boolean;
  useCompanies: boolean;
  useCalendar: boolean;
  optimizeOrder: boolean;
  originAddress: string | null;
  originGeocoded: boolean;
  lastRunAt: string | null;
  lastRunOk: boolean | null;
  lastRunSummary: string | null;
};

export type AutoRouteSettingsInput = Partial<{
  enabled: boolean;
  useCompanies: boolean;
  useCalendar: boolean;
  optimizeOrder: boolean;
  originAddress: string | null;
}>;

/** Sem registro, só o usuário do cron antigo (CRON_USER_EMAIL) fica ativado. */
function enabledByDefault(email: string): boolean {
  return email.toLowerCase() === process.env.CRON_USER_EMAIL?.trim().toLowerCase();
}

export async function getAutoRouteSettings(userId: string): Promise<AutoRouteSettingsView> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, autoRoute: true },
  });
  const s = user.autoRoute;
  return {
    enabled: s?.enabled ?? enabledByDefault(user.email),
    useCompanies: s?.useCompanies ?? true,
    useCalendar: s?.useCalendar ?? true,
    optimizeOrder: s?.optimizeOrder ?? true,
    originAddress: s?.originAddress ?? null,
    originGeocoded: s?.originLat != null && s?.originLng != null,
    lastRunAt: s?.lastRunAt?.toISOString() ?? null,
    lastRunOk: s?.lastRunOk ?? null,
    lastRunSummary: s?.lastRunSummary ?? null,
  };
}

export async function updateAutoRouteSettings(
  userId: string,
  input: AutoRouteSettingsInput
): Promise<AutoRouteSettingsView> {
  const current = await getAutoRouteSettings(userId);
  const data: Record<string, unknown> = { ...input };

  // Endereço de saída novo: geocodifica já, para a otimização ter o ponto.
  if (input.originAddress !== undefined) {
    const address = input.originAddress?.trim() || null;
    data.originAddress = address;
    const point = address ? await geocodeAddress(address) : null;
    data.originLat = point?.lat ?? null;
    data.originLng = point?.lng ?? null;
  }

  // A primeira gravação fixa o `enabled` efetivo, que até então era só padrão.
  await prisma.autoRouteSettings.upsert({
    where: { userId },
    create: { userId, enabled: current.enabled, ...data },
    update: data,
  });
  return getAutoRouteSettings(userId);
}

type SourceOutcome = { ok: true; routesCreated: number; stopsAdded: number } | { ok: false; error: string };

export type AutoRouteRunResult = {
  companies: SourceOutcome | { skipped: string };
  calendar: SourceOutcome | { skipped: string };
  routesReordered: number;
  changedRouteIds: string[];
  summary: string;
};

/** Junta as fontes nas rotas do usuário (sem reordenar nem geocodificar). */
async function syncSources(
  userId: string,
  settings: AutoRouteSettingsView
): Promise<Omit<AutoRouteRunResult, "routesReordered" | "summary">> {
  const changed = new Set<string>();

  let companies: AutoRouteRunResult["companies"];
  if (!settings.useCompanies) companies = { skipped: "desativado" };
  else {
    try {
      const r = await syncCompanyDatesToRoutes(userId);
      for (const id of r.changedRouteIds) changed.add(id);
      companies = { ok: true, routesCreated: r.routesCreated, stopsAdded: r.stopsAdded };
    } catch (err) {
      companies = { ok: false, error: err instanceof Error ? err.message : "falha" };
    }
  }

  let calendar: AutoRouteRunResult["calendar"];
  if (!settings.useCalendar) calendar = { skipped: "desativado" };
  else {
    try {
      const r = await syncCalendarEventsToRoutes(userId);
      if (!r.ok) calendar = { skipped: "Google Agenda não conectado" };
      else {
        for (const id of r.changedRouteIds) changed.add(id);
        calendar = { ok: true, routesCreated: r.routesCreated, stopsAdded: r.stopsAdded };
      }
    } catch (err) {
      calendar = { ok: false, error: err instanceof Error ? err.message : "falha" };
    }
  }

  return { companies, calendar, changedRouteIds: [...changed] };
}

/**
 * Reordena as paradas ainda não visitadas pelo melhor trajeto. Visitadas ficam
 * no começo (na ordem em que foram feitas) e as sem coordenadas, no fim. Só
 * mexe em rotas de hoje em diante.
 */
export async function reorderRoute(routeId: string, origin: { lat: number; lng: number } | null) {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    select: { date: true, stops: { orderBy: { order: "asc" } } },
  });
  if (!route) return false;
  if (route.date && route.date.toISOString().slice(0, 10) < todayKey(APP_TIME_ZONE)) return false;

  const visited = route.stops
    .filter((s) => s.visitedAt)
    .sort((a, b) => a.visitedAt!.getTime() - b.visitedAt!.getTime());
  const pending = route.stops.filter((s) => !s.visitedAt);
  const located = pending.flatMap((s) => (s.lat != null && s.lng != null ? [{ ...s, lat: s.lat, lng: s.lng }] : []));
  const unlocated = pending.filter((s) => s.lat == null || s.lng == null);
  if (located.length < 2) return false;

  // Sai do ponto de partida; sem ele, da última parada visitada (se houver).
  const lastVisited = visited.at(-1);
  const start =
    origin ?? (lastVisited?.lat != null && lastVisited.lng != null ? { lat: lastVisited.lat, lng: lastVisited.lng } : null);
  const { ordered } = await optimizeOrder(located, start);

  const finalOrder = [...visited, ...ordered, ...unlocated];
  const updates = finalOrder.flatMap((stop, order) =>
    stop.order === order ? [] : [prisma.stop.update({ where: { id: stop.id }, data: { order } })]
  );
  if (updates.length === 0) return false;
  await prisma.$transaction(updates);
  return true;
}

function describe(result: Omit<AutoRouteRunResult, "summary">): string {
  let routes = 0;
  let stops = 0;
  const notes: string[] = [];
  for (const [label, outcome] of [
    ["Empresas", result.companies],
    ["Agenda", result.calendar],
  ] as const) {
    if ("skipped" in outcome) continue;
    if (!outcome.ok) notes.push(`${label}: ${outcome.error}`);
    else {
      routes += outcome.routesCreated;
      stops += outcome.stopsAdded;
    }
  }
  const parts = [
    `${routes} ${routes === 1 ? "rota criada" : "rotas criadas"}`,
    `${stops} ${stops === 1 ? "parada nova" : "paradas novas"}`,
  ];
  if (result.routesReordered > 0) {
    parts.push(`${result.routesReordered} ${result.routesReordered === 1 ? "rota reordenada" : "rotas reordenadas"}`);
  }
  return [parts.join(", "), ...notes].join(" · ");
}

async function finishRun(
  userId: string,
  settings: AutoRouteSettingsView,
  synced: Awaited<ReturnType<typeof syncSources>>
): Promise<AutoRouteRunResult> {
  let routesReordered = 0;
  if (settings.optimizeOrder) {
    const row = await prisma.autoRouteSettings.findUnique({
      where: { userId },
      select: { originLat: true, originLng: true },
    });
    const origin = row?.originLat != null && row.originLng != null ? { lat: row.originLat, lng: row.originLng } : null;
    for (const routeId of synced.changedRouteIds) {
      try {
        if (await reorderRoute(routeId, origin)) routesReordered++;
      } catch (err) {
        console.error("[auto-route] falha ao reordenar", routeId, err);
      }
    }
  }

  const base = { ...synced, routesReordered };
  const summary = describe(base);
  const ok = ![synced.companies, synced.calendar].some((o) => "ok" in o && !o.ok);
  await prisma.autoRouteSettings.upsert({
    where: { userId },
    create: { userId, enabled: settings.enabled, lastRunAt: new Date(), lastRunOk: ok, lastRunSummary: summary },
    update: { lastRunAt: new Date(), lastRunOk: ok, lastRunSummary: summary },
  });
  return { ...base, summary };
}

/** "Gerar agora": roda para o usuário mesmo com a automática desligada. */
export async function runAutoRouteForUser(userId: string): Promise<AutoRouteRunResult> {
  const settings = await getAutoRouteSettings(userId);
  const synced = await syncSources(userId, settings);
  // Poucas paradas novas: geocodifica só um punhado para não segurar a resposta.
  if (settings.optimizeOrder && synced.changedRouteIds.length > 0) await backfillCoordinates(8);
  return finishRun(userId, settings, synced);
}

/** Usuários atendidos pelo cron: os que ativaram, mais o CRON_USER_EMAIL sem registro. */
async function cronUserIds(): Promise<string[]> {
  const cronEmail = process.env.CRON_USER_EMAIL?.trim();
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { autoRoute: { enabled: true } },
        ...(cronEmail ? [{ email: { equals: cronEmail, mode: "insensitive" as const }, autoRoute: null }] : []),
      ],
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/** Cron diário: sincroniza todos, geocodifica uma vez e só então reordena. */
export async function runAutoRouteForAllUsers() {
  const userIds = await cronUserIds();
  const synced = [];
  for (const userId of userIds) {
    const settings = await getAutoRouteSettings(userId);
    synced.push({ userId, settings, result: await syncSources(userId, settings) });
  }

  const geocode = await backfillCoordinates();

  const users = [];
  for (const { userId, settings, result } of synced) {
    const done = await finishRun(userId, settings, result);
    users.push({ userId, summary: done.summary });
  }
  return { users, geocode };
}
