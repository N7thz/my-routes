import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RunrunitTask } from "@/lib/runrunit-service";

type NotConfiguredResult = { reason: "not-configured" };

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchRunrunitTasks(
  month: string
): Promise<RunrunitTask[] | NotConfiguredResult> {
  const params = new URLSearchParams({ month });
  const res = await fetch(`/api/runrunit/tasks?${params}`);
  if (res.status === 404) return res.json() as Promise<NotConfiguredResult>;
  if (!res.ok) throw new Error("Falha ao carregar tarefas do Runrunit");
  return res.json();
}

export function useRunrunitTasks() {
  const month = useMemo(currentMonth, []);
  return useQuery({
    queryKey: ["runrunit", "tasks", month],
    queryFn: () => fetchRunrunitTasks(month),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
