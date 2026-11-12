import { useQuery } from "@tanstack/react-query";
import { apiOrUnavailable } from "@/lib/api-client";
import type { GoogleUnavailableReason } from "@/lib/google-auth";
import type { CalendarEvent } from "@/lib/google-calendar-service";

export type CalendarDateRange = { timeMin: string; timeMax: string };

export const CALENDAR_EVENTS_KEY = ["google", "calendar", "events"] as const;

export function useGoogleCalendar(range?: CalendarDateRange) {
  return useQuery({
    queryKey: [...CALENDAR_EVENTS_KEY, range?.timeMin, range?.timeMax],
    queryFn: () =>
      apiOrUnavailable<CalendarEvent[], GoogleUnavailableReason>(
        `/api/google/calendar/events?${new URLSearchParams(range)}`,
        "Falha ao carregar eventos do Google Agenda"
      ),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
