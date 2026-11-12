import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { CALENDAR_EVENTS_KEY } from "@/hooks/use-google-calendar";

export type SyncTasksResult = {
  created: number;
  skipped: number;
  total: number;
  events: { taskId: number; title: string }[];
};

/**
 * Falha com `ApiError.reason`: "not-configured", "not-connected",
 * "no-calendar-scope", "no-write-scope" ou "unauthenticated".
 */
export function useSyncTasksToCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<SyncTasksResult>(
        "/api/google/calendar/sync-tasks",
        "Falha ao sincronizar tarefas com o Google Agenda",
        { method: "POST" }
      ),
    onSuccess: (result) => {
      if (result.created > 0) queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_KEY });
    },
  });
}
