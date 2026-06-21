import { useQuery } from "@tanstack/react-query";
import type { RunrunitTask } from "@/lib/runrunit-service";

type NotConfiguredResult = { reason: "not-configured" };

async function fetchAllTasks(): Promise<RunrunitTask[] | NotConfiguredResult> {
  const res = await fetch("/api/runrunit/tasks?mode=all");
  if (res.status === 404) return res.json() as Promise<NotConfiguredResult>;
  if (!res.ok) throw new Error("Falha ao carregar tarefas do Runrunit");
  return res.json();
}

export function useRunrunitList() {
  return useQuery({
    queryKey: ["runrunit", "tasks", "all"],
    queryFn: fetchAllTasks,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
