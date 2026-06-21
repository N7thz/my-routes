import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
