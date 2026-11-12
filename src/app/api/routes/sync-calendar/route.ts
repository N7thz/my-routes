import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { syncCalendarEventsToRoutes } from "@/lib/route-sync-service";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ reason: "unauthenticated" }, { status: 401 });

  const result = await syncCalendarEventsToRoutes(user.id);
  // Google não conectado ou sem escopo de calendário — mesmo contrato de
  // /api/google/calendar/events, para o cliente oferecer a reconexão.
  if (!result.ok) return NextResponse.json({ reason: result.reason }, { status: 404 });

  return NextResponse.json(result);
}
