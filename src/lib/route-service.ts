import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllRunrunitTasks } from "@/lib/runrunit-service";
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

/**
 * Cria uma rota (Rascunho) a partir das empresas cadastradas com a data informada,
 * cada empresa virando uma parada. Lança se não houver empresas nessa data.
 */
export async function generateRouteFromDate(dateIso: string): Promise<RouteRecord> {
  const userId = await currentUserId();

  // company.date é armazenada à meia-noite UTC; casamos o dia por intervalo.
  const start = new Date(`${dateIso}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const companies = await prisma.company.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true, lat: true, lng: true },
  });
  if (companies.length === 0) {
    throw new Error("Nenhuma empresa cadastrada nesta data");
  }

  const label = new Date(`${dateIso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return prisma.route.create({
    data: {
      userId,
      name: `Rota do dia ${label}`,
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

  const todayStr = new Date().toISOString().slice(0, 10);
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
    const start = new Date(`${day}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

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
      const label = new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
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
