import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { RunrunitComment } from "@/lib/runrunit";

export function useRunrunitComments(taskId?: number) {
  return useQuery({
    queryKey: ["runrunit", "comments", taskId],
    queryFn: () =>
      api<RunrunitComment[]>(`/api/runrunit/tasks/${taskId}/comments`, "Falha ao carregar comentários"),
    enabled: !!taskId,
    staleTime: 60 * 1000,
  });
}
