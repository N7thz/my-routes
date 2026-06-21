import { useQuery } from "@tanstack/react-query";
import type { RunrunitComment } from "@/lib/runrunit-service";

async function fetchComments(taskId: number): Promise<RunrunitComment[]> {
  const res = await fetch(`/api/runrunit/tasks/${taskId}/comments`);
  if (!res.ok) throw new Error("Falha ao carregar comentários");
  return res.json();
}

export function useRunrunitComments(taskId?: number) {
  return useQuery({
    queryKey: ["runrunit", "comments", taskId],
    queryFn: () => fetchComments(taskId!),
    enabled: !!taskId,
    staleTime: 60 * 1000,
  });
}
