import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { requireUserId } from "@/lib/session";
import { syncCalendarEventsToRoutes } from "@/lib/route-sync-service";

export const POST = apiRoute(async () => {
  const result = await syncCalendarEventsToRoutes(await requireUserId());
  // Google não conectado ou sem escopo de calendário — mesmo contrato de
  // /api/google/calendar/events, para o cliente oferecer a reconexão.
  if (!result.ok) return NextResponse.json({ reason: result.reason }, { status: 404 });
  return NextResponse.json(result);
});
