import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { requireUserId } from "@/lib/session";
import { listUnmatchedEvents } from "@/lib/route-sync-service";

export const dynamic = "force-dynamic";

/** Eventos dos próximos dias que não citam nenhuma empresa cadastrada. */
export const GET = apiRoute(async () => {
  const result = await listUnmatchedEvents(await requireUserId());
  // Mesmo contrato de /api/routes/sync-calendar quando falta o Google.
  if (!result.ok) return NextResponse.json({ reason: result.reason }, { status: 404 });
  return NextResponse.json(result.events);
});
