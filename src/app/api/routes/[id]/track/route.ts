import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { routeTrackSchema } from "@/lib/schemas";
import { appendTrackPoints, listTrackPoints } from "@/lib/route-track-service";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

/** Trajeto gravado da rota (posições do GPS em ordem de horário). */
export const GET = apiRoute(async (_req, { params }: Params) => {
  const { id } = await params;
  return NextResponse.json(await listTrackPoints(id));
});

/** Recebe um lote de posições do aparelho (também via `navigator.sendBeacon`). */
export const POST = apiRoute(async (req, { params }: Params) => {
  const { id } = await params;
  const { points } = await parseBody(req, routeTrackSchema);
  return NextResponse.json(await appendTrackPoints(id, points), { status: 201 });
});
