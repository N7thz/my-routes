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

/**
 * Chave usada para marcar (e depois reconhecer) um evento criado a partir de
 * uma tarefa do Runrunit — evita duplicar na próxima sincronização.
 */
export const RUNRUNIT_TASK_PROP = "runrunitTaskId";

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

export type NewCalendarEvent = {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  runrunitTaskId: number;
};

/**
 * Retorna os IDs de tarefas Runrunit que já possuem evento no calendário,
 * dentro da janela informada. Faz uma única chamada e lê o marcador gravado
 * em `extendedProperties.private.runrunitTaskId`.
 */
export async function fetchSyncedTaskIds(
  accessToken: string,
  options: { timeMin: string; timeMax: string; calendarId?: string }
): Promise<Set<number>> {
  const calendarId = options.calendarId ?? "primary";
  // A API não suporta wildcard em privateExtendedProperty, então listamos os
  // eventos da janela e lemos o marcador de cada um (extendedProperties vêm
  // no recurso do evento por padrão).
  const params = new URLSearchParams({
    timeMin: options.timeMin,
    timeMax: options.timeMax,
    maxResults: "2500",
    singleEvents: "true",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);

  const data = (await res.json()) as {
    items?: { extendedProperties?: { private?: Record<string, string> } }[];
  };

  const ids = new Set<number>();
  for (const item of data.items ?? []) {
    const raw = item.extendedProperties?.private?.[RUNRUNIT_TASK_PROP];
    if (raw) ids.add(Number(raw));
  }
  return ids;
}

export async function createCalendarEvent(
  accessToken: string,
  input: NewCalendarEvent,
  calendarId = "primary"
): Promise<CalendarEvent> {
  const { runrunitTaskId, ...rest } = input;
  const body = {
    ...rest,
    extendedProperties: {
      private: { [RUNRUNIT_TASK_PROP]: String(runrunitTaskId) },
    },
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new CalendarApiError(res.status, `Google Calendar create error: ${res.status} ${text}`);
  }

  return res.json() as Promise<CalendarEvent>;
}
