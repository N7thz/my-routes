import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodeStop } from "@/lib/geocode";
import { stopFromCompany, type DayCompany } from "@/lib/route-sync-match";

export { stopFromCompany, type DayCompany };
import { requireUserId } from "@/lib/session";
import { HttpError, NotFoundError } from "@/lib/http-errors";
import { dayRange, defaultRoutesFrom, formatDate } from "@/lib/dates";
import type { RouteStatus } from "../../prisma/generated/enums";
import { statusFromStops } from "@/lib/route-status";

export type { RouteStatus };

export type StopRecord = {
  id: string;
  routeId: string;
  companyId: string | null;
  company: { id: string; name: string } | null;
  label: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  /** Endereço que o geocodificador não encontrou (fica fora do mapa). */
  geocodeFailedAt: Date | null;
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


/** Empresas agendadas (`Company.date`) para o dia. */
export function companiesOnDay(day: string): Promise<DayCompany[]> {
  const { start, end } = dayRange(day);
  return prisma.company.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true, lat: true, lng: true },
  });
}

export function dayRouteName(day: string, detail?: string): string {
  const name = `Rota do dia ${formatDate(day)}`;
  return detail ? `${name} · ${detail}` : name;
}


export type RouteRange = { from?: string; to?: string };

/** Dia AAAA-MM-DD deslocado em `days` (negativo = para trás). */
export function shiftDayKey(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Rotas do usuário dentro da janela [from, to] (dias AAAA-MM-DD), sempre com
 * as sem data. Sem `from`, vai até ROUTES_LOOKBACK_DAYS atrás — o
 * histórico antigo só é lido quando a tela navega até ele.
 */
export async function listRoutes(range: RouteRange = {}): Promise<RouteRecord[]> {
  const userId = await requireUserId();
  const from = range.from ?? defaultRoutesFrom();
  return prisma.route.findMany({
    where: {
      userId,
      OR: [
        { date: null },
        {
          date: {
            gte: dayRange(from).start,
            ...(range.to && { lt: dayRange(range.to).end }),
          },
        },
      ],
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    ...routeInclude,
  });
}

export type RouteDay = { day: string | null; count: number };

/** Todos os dias que têm rota (null = sem data), leve: só para navegar entre dias. */
export async function listRouteDays(): Promise<RouteDay[]> {
  const userId = await requireUserId();
  const groups = await prisma.route.groupBy({
    by: ["date"],
    where: { userId },
    _count: { _all: true },
    orderBy: { date: "asc" },
  });
  return groups.map((g) => ({
    day: g.date ? g.date.toISOString().slice(0, 10) : null,
    count: g._count._all,
  }));
}

export async function getRoute(id: string): Promise<RouteRecord | null> {
  const userId = await requireUserId();
  return prisma.route.findFirst({ where: { id, userId }, ...routeInclude });
}

export type RouteCreateInput = { name: string; date?: string | null };

export async function createRoute(data: RouteCreateInput): Promise<RouteRecord> {
  const userId = await requireUserId();
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
export async function generateRouteFromDate(day: string): Promise<RouteRecord> {
  const userId = await requireUserId();

  const companies = await companiesOnDay(day);
  if (companies.length === 0) {
    throw new HttpError(400, "Nenhuma empresa cadastrada nesta data");
  }

  return prisma.route.create({
    data: {
      userId,
      name: dayRouteName(day),
      date: dayRange(day).start,
      stops: {
        create: companies.map((company, order) => ({ ...stopFromCompany(company), order })),
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
  const userId = await requireUserId();
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
  const userId = await requireUserId();
  await prisma.route.delete({ where: { id, userId } });
}

export type StopCreateInput = {
  companyId?: string | null;
  label?: string | null;
  address: string;
  lat?: number | null;
  lng?: number | null;
};

async function requireOwnRoute(routeId: string): Promise<void> {
  const userId = await requireUserId();
  const route = await prisma.route.findFirst({ where: { id: routeId, userId } });
  if (!route) throw new NotFoundError("Rota não encontrada");
}

/** Recalcula o status da rota pelas paradas (ver `statusFromStops`). */
async function syncRouteStatus(routeId: string): Promise<void> {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    select: { status: true, stops: { select: { visitedAt: true } } },
  });
  if (!route) return;
  const status = statusFromStops(route.status, route.stops);
  if (status !== route.status) await prisma.route.update({ where: { id: routeId }, data: { status } });
}

export async function addStop(routeId: string, data: StopCreateInput): Promise<StopRecord> {
  await requireOwnRoute(routeId);

  // Parada de empresa herda as coordenadas já conhecidas da empresa.
  let point = { lat: data.lat ?? null, lng: data.lng ?? null };
  if (point.lat === null && data.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      select: { lat: true, lng: true, address: true },
    });
    if (company?.lat != null && company.address === data.address) {
      point = { lat: company.lat, lng: company.lng };
    }
  }

  const stop = await prisma.$transaction(async (tx) => {
    // Trava a rota: duas inclusões simultâneas não leem o mesmo "último order".
    await tx.$executeRaw`SELECT 1 FROM "route" WHERE "id" = ${routeId} FOR UPDATE`;
    const { _max } = await tx.stop.aggregate({ where: { routeId }, _max: { order: true } });

    return tx.stop.create({
      data: {
        routeId,
        companyId: data.companyId ?? null,
        label: data.label ?? null,
        address: data.address,
        ...point,
        order: (_max.order ?? -1) + 1,
      },
      ...stopInclude,
    });
  });

  await syncRouteStatus(routeId);
  if (stop.lat === null && stop.address) after(() => geocodeStop(stop.id));
  return stop;
}

export async function removeStop(routeId: string, stopId: string): Promise<void> {
  await requireOwnRoute(routeId);
  await prisma.stop.delete({ where: { id: stopId, routeId } });
  await syncRouteStatus(routeId);
}

export async function markStopVisited(
  routeId: string,
  stopId: string,
  visited: boolean
): Promise<StopRecord> {
  await requireOwnRoute(routeId);
  const stop = await prisma.stop.update({
    where: { id: stopId, routeId },
    data: { visitedAt: visited ? new Date() : null },
    ...stopInclude,
  });
  await syncRouteStatus(routeId);
  return stop;
}

/** Reordena as paradas: cada id recebe `order` = seu índice na lista. */
export async function reorderStops(routeId: string, orderedIds: string[]): Promise<void> {
  await requireOwnRoute(routeId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.stop.updateMany({ where: { id, routeId }, data: { order: index } })
    )
  );
}
