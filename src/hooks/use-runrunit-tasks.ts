import { useQuery } from "@tanstack/react-query";
import { apiOrUnavailable } from "@/lib/api-client";
import { currentMonthKey } from "@/lib/dates";
import type { RunrunitTask } from "@/lib/runrunit";

function fetchTasks(query: string) {
  return apiOrUnavailable<RunrunitTask[], "not-configured">(
    `/api/runrunit/tasks${query}`,
    "Falha ao carregar tarefas do Runrunit"
  );
}

/** Tarefas do mês atual mais as sem data — o recorte do calendário. */
export function useRunrunitTasks() {
  const month = currentMonthKey();
  return useQuery({
    queryKey: ["runrunit", "tasks", month],
    queryFn: () => fetchTasks(`?month=${month}`),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

/** Todas as tarefas, sem recorte de data. */
export function useRunrunitList() {
  return useQuery({
    queryKey: ["runrunit", "tasks", "all"],
    queryFn: () => fetchTasks(""),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
