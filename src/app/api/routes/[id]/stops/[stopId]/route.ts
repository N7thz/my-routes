import { NextRequest, NextResponse } from "next/server";
import { removeStop, markStopVisited } from "@/lib/route-service";

type Params = { params: Promise<{ id: string; stopId: string }> };

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id: routeId, stopId } = await params;
  await removeStop(routeId, stopId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: routeId, stopId } = await params;
  const body = await req.json();
  const stop = await markStopVisited(routeId, stopId, body.visited ?? true);
  return NextResponse.json(stop);
}
