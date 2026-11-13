import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { getGoogleCalendarToken } from "@/lib/google-auth";
import { listCalendarEvents } from "@/lib/google-calendar-service";

export const GET = apiRoute(async (request) => {
  const result = await getGoogleCalendarToken();
  if (!result.hasCalendarScope) {
    return NextResponse.json({ reason: result.reason }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin") ?? undefined;
  const timeMax = searchParams.get("timeMax") ?? undefined;

  return NextResponse.json(await listCalendarEvents(result.accessToken, { timeMin, timeMax }));
});
