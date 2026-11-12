import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { dayRange, formatDate } from "@/lib/dates";
import type { RouteStatus } from "../../prisma/generated/enums";

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

export type DayCompany = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

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

export function stopFromCompany(company: DayCompany) {
  return {
    companyId: company.id,
    label: company.name,
    address: company.address ?? "",
    lat: company.lat,
    lng: company.lng,
  };
}

export async function listRoutes(): Promise<RouteRecord[]> {
  const userId = await requireUserId();
  return prisma.route.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    ...routeInclude,
  });
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
    throw new Error("Nenhuma empresa cadastrada nesta data");
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
  if (!route) throw new Error("Rota não encontrada");
}

export async function addStop(routeId: string, data: StopCreateInput): Promise<StopRecord> {
  await requireOwnRoute(routeId);

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
  await requireOwnRoute(routeId);
  await prisma.stop.delete({ where: { id: stopId, routeId } });
}

export async function markStopVisited(
  routeId: string,
  stopId: string,
  visited: boolean
): Promise<StopRecord> {
  await requireOwnRoute(routeId);
  return prisma.stop.update({
    where: { id: stopId, routeId },
    data: { visitedAt: visited ? new Date() : null },
    ...stopInclude,
  });
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
