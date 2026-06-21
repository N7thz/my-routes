import { NextResponse } from "next/server";
import { getGoogleCalendarToken } from "@/lib/google-auth";
import { listCalendarEvents } from "@/lib/google-calendar-service";

export async function GET(request: Request) {
  const result = await getGoogleCalendarToken();

  if (!result.hasCalendarScope) {
    return NextResponse.json({ reason: result.reason }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin") ?? undefined;
  const timeMax = searchParams.get("timeMax") ?? undefined;

  const events = await listCalendarEvents(result.accessToken, { timeMin, timeMax });
  return NextResponse.json(events);
}
