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

export type NewCalendarEvent = {
  summary: string;
  description?: string;
  location?: string;
  start: EventTime;
  end: EventTime;
  runrunitTaskId: number;
};

/** Erro da API do Google Calendar com o status HTTP preservado. */
export class CalendarApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "CalendarApiError";
  }
}

/**
 * Chave usada para marcar (e depois reconhecer) um evento criado a partir de
 * uma tarefa do Runrunit — evita duplicar na próxima sincronização.
 */
const RUNRUNIT_TASK_PROP = "runrunitTaskId";

const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

async function calendarFetch<T>(accessToken: string, query: string, body?: unknown): Promise<T> {
  const res = await fetch(`${EVENTS_URL}${query}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new CalendarApiError(res.status, `Google Calendar API error: ${res.status} ${text}`);
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

/**
 * IDs de tarefas Runrunit que já têm evento na janela informada. A API não
 * suporta wildcard em privateExtendedProperty, então lista os eventos da
 * janela e lê o marcador de cada um.
 */
export async function fetchSyncedTaskIds(
  accessToken: string,
  range: { timeMin: string; timeMax: string }
): Promise<Set<number>> {
  const events = await listCalendarEvents(accessToken, { ...range, maxResults: 2500 });
  const ids = new Set<number>();
  for (const event of events) {
    const raw = event.extendedProperties?.private?.[RUNRUNIT_TASK_PROP];
    if (raw) ids.add(Number(raw));
  }
  return ids;
}

export async function createCalendarEvent(
  accessToken: string,
  { runrunitTaskId, ...event }: NewCalendarEvent
): Promise<CalendarEvent> {
  return calendarFetch<CalendarEvent>(accessToken, "", {
    ...event,
    extendedProperties: { private: { [RUNRUNIT_TASK_PROP]: String(runrunitTaskId) } },
  });
}
