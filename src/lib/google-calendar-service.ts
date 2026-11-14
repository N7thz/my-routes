type EventTime = { dateTime?: string; date?: string; timeZone?: string };

export type CalendarEvent = {
  id: string;
  summary?: string;
  start: EventTime;
  end: EventTime;
  location?: string;
  description?: string;
  htmlLink: string;
  colorId?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  extendedProperties?: { private?: Record<string, string> };
};

/**
 * Início do evento como veio da agenda. Tanto `date` quanto `dateTime` já
 * trazem a data pretendida nos 10 primeiros caracteres (o `dateTime` vem com o
 * offset do próprio evento), então fatiar dá o dia sem a conversão de fuso que
 * `new Date()` faria.
 */
export function eventStart(event: Pick<CalendarEvent, "start">): string {
  return event.start.dateTime ?? event.start.date ?? "";
}

const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

async function calendarFetch<T>(accessToken: string, query: string): Promise<T> {
  const res = await fetch(`${EVENTS_URL}${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Calendar API error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function listCalendarEvents(
  accessToken: string,
  options?: { maxResults?: number; timeMin?: string; timeMax?: string }
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: options?.timeMin ?? new Date().toISOString(),
    maxResults: String(options?.maxResults ?? 250),
    orderBy: "startTime",
    singleEvents: "true",
  });
  if (options?.timeMax) params.set("timeMax", options.timeMax);

  const data = await calendarFetch<{ items?: CalendarEvent[] }>(accessToken, `?${params}`);
  return data.items ?? [];
}
