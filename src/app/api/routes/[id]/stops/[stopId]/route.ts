import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { stopVisitedSchema } from "@/lib/schemas";
import { removeStop, markStopVisited } from "@/lib/route-service";

type Params = { params: Promise<{ id: string; stopId: string }> };

export const DELETE = apiRoute(async (_req, { params }: Params) => {
  const { id: routeId, stopId } = await params;
  await removeStop(routeId, stopId);
  return NextResponse.json({ ok: true });
});

export const PATCH = apiRoute(async (req, { params }: Params) => {
  const { id: routeId, stopId } = await params;
  const { visited } = await parseBody(req, stopVisitedSchema);
  return NextResponse.json(await markStopVisited(routeId, stopId, visited));
});
