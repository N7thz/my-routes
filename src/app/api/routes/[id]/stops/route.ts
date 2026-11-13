import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { stopCreateSchema, stopReorderSchema } from "@/lib/schemas";
import { addStop, reorderStops } from "@/lib/route-service";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req, { params }: Params) => {
  const { id: routeId } = await params;
  const stop = await addStop(routeId, await parseBody(req, stopCreateSchema));
  return NextResponse.json(stop, { status: 201 });
});

export const PATCH = apiRoute(async (req, { params }: Params) => {
  const { id: routeId } = await params;
  const { orderedIds } = await parseBody(req, stopReorderSchema);
  await reorderStops(routeId, orderedIds);
  return NextResponse.json({ ok: true });
});
