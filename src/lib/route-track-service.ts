import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { NotFoundError } from "@/lib/http-errors";

export type TrackPoint = { lat: number; lng: number; accuracy: number | null; at: number };

/** Leituras com data muito no futuro (relógio errado do aparelho) são descartadas. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
/** Teto de pontos devolvidos para desenhar o trajeto de uma rota. */
const MAX_POINTS = 5000;

async function requireOwnRouteId(routeId: string): Promise<void> {
  const userId = await requireUserId();
  const route = await prisma.route.findFirst({ where: { id: routeId, userId }, select: { id: true } });
  if (!route) throw new NotFoundError("Rota não encontrada");
}

/** Grava um lote de posições no trajeto da rota. */
export async function appendTrackPoints(
  routeId: string,
  points: { lat: number; lng: number; accuracy?: number | null; at: number }[]
): Promise<{ saved: number }> {
  await requireOwnRouteId(routeId);
  const limit = Date.now() + MAX_CLOCK_SKEW_MS;
  const data = points
    .filter((p) => p.at <= limit)
    .map((p) => ({
      routeId,
      lat: p.lat,
      lng: p.lng,
      accuracy: p.accuracy ?? null,
      recordedAt: new Date(p.at),
    }));
  if (data.length === 0) return { saved: 0 };
  const { count } = await prisma.routePoint.createMany({ data });
  return { saved: count };
}

/** Trajeto da rota, em ordem de horário. */
export async function listTrackPoints(routeId: string): Promise<TrackPoint[]> {
  await requireOwnRouteId(routeId);
  const rows = await prisma.routePoint.findMany({
    where: { routeId },
    orderBy: { recordedAt: "asc" },
    take: MAX_POINTS,
    select: { lat: true, lng: true, accuracy: true, recordedAt: true },
  });
  return rows.map((r) => ({ lat: r.lat, lng: r.lng, accuracy: r.accuracy, at: r.recordedAt.getTime() }));
}
