import { useQuery } from "@tanstack/react-query";
import type { CalendarEvent } from "@/lib/google-calendar-service";

type NotConnectedResult = { reason: "not-connected" | "no-calendar-scope" | "unauthenticated" };

export type CalendarDateRange = { timeMin: string; timeMax: string };

async function fetchCalendarEvents(
  range?: CalendarDateRange
): Promise<CalendarEvent[] | NotConnectedResult> {
  const params = new URLSearchParams();
  if (range?.timeMin) params.set("timeMin", range.timeMin);
  if (range?.timeMax) params.set("timeMax", range.timeMax);

  const res = await fetch(`/api/google/calendar/events?${params}`);
  if (res.status === 404) return res.json() as Promise<NotConnectedResult>;
  if (!res.ok) throw new Error("Falha ao carregar eventos do Google Agenda");
  return res.json();
}

export function useGoogleCalendar(range?: CalendarDateRange) {
  return useQuery({
    queryKey: ["google", "calendar", "events", range?.timeMin, range?.timeMax],
    queryFn: () => fetchCalendarEvents(range),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
