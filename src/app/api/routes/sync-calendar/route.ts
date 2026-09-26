import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { syncCalendarEventsToRoutes } from "@/lib/route-service";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ reason: "unauthenticated" }, { status: 401 });
  }

  const result = await syncCalendarEventsToRoutes(session.user.id);
  // Google não conectado ou sem escopo de calendário — mesmo contrato de
  // /api/google/calendar/events, para o cliente oferecer a reconexão.
  if (!result.ok) return NextResponse.json({ reason: result.reason }, { status: 404 });

  return NextResponse.json(result);
}
