export type CalendarEvent = {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  description?: string;
  htmlLink: string;
  colorId?: string;
  status?: "confirmed" | "tentative" | "cancelled";
};

type EventsResponse = {
  items: CalendarEvent[];
  nextPageToken?: string;
};

export async function listCalendarEvents(
  accessToken: string,
  options?: {
    maxResults?: number;
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
  }
): Promise<CalendarEvent[]> {
  const calendarId = options?.calendarId ?? "primary";
  const maxResults = options?.maxResults ?? 250;

  const params = new URLSearchParams({
    timeMin: options?.timeMin ?? new Date().toISOString(),
    maxResults: String(maxResults),
    orderBy: "startTime",
    singleEvents: "true",
  });

  if (options?.timeMax) params.set("timeMax", options.timeMax);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);

  const data = (await res.json()) as EventsResponse;
  return data.items ?? [];
}
