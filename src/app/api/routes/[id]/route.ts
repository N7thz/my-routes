import { NextResponse } from "next/server";
import { apiRoute, NotFoundError, parseBody } from "@/lib/api-handler";
import { routeUpdateSchema } from "@/lib/schemas";
import { getRoute, updateRoute, deleteRoute } from "@/lib/route-service";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req, { params }: Params) => {
  const { id } = await params;
  const route = await getRoute(id);
  if (!route) throw new NotFoundError("Rota não encontrada");
  return NextResponse.json(route);
});

export const PUT = apiRoute(async (req, { params }: Params) => {
  const { id } = await params;
  return NextResponse.json(await updateRoute(id, await parseBody(req, routeUpdateSchema)));
});

export const DELETE = apiRoute(async (_req, { params }: Params) => {
  const { id } = await params;
  await deleteRoute(id);
  return NextResponse.json({ ok: true });
});
