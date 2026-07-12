import { useMutation, useQueryClient } from "@tanstack/react-query";

export type SyncTasksResult = {
  created: number;
  skipped: number;
  total: number;
  events: { taskId: number; title: string }[];
};

type SyncError = {
  reason: "not-configured" | "not-connected" | "no-calendar-scope" | "no-write-scope" | "unauthenticated";
};

export class SyncTasksError extends Error {
  constructor(public reason: SyncError["reason"]) {
    super(reason);
    this.name = "SyncTasksError";
  }
}

async function syncTasksToCalendar(): Promise<SyncTasksResult> {
  const res = await fetch("/api/google/calendar/sync-tasks", { method: "POST" });

  if (res.status === 404 || res.status === 403) {
    const body = (await res.json()) as SyncError;
    throw new SyncTasksError(body.reason);
  }
  if (!res.ok) throw new Error("Falha ao sincronizar tarefas com o Google Agenda");

  return res.json();
}

export function useSyncTasksToCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncTasksToCalendar,
    onSuccess: (result) => {
      // Recarrega os eventos do calendário se algo novo foi criado.
      if (result.created > 0) {
        queryClient.invalidateQueries({ queryKey: ["google", "calendar", "events"] });
      }
    },
  });
}
