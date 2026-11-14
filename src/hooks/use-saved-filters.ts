import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { SavedFilterRecord } from "@/lib/saved-filter-service";
import type { SavedFilterScreen } from "@/lib/schemas";

export type { SavedFilterRecord, SavedFilterScreen };

const key = (screen: SavedFilterScreen) => ["saved-filters", screen] as const;

export function useSavedFilters(screen: SavedFilterScreen) {
  return useQuery({
    queryKey: key(screen),
    queryFn: () =>
      api<SavedFilterRecord[]>(`/api/saved-filters?screen=${screen}`, "Falha ao carregar filtros salvos"),
    staleTime: 5 * 60 * 1000,
  });
}

/** Salva os filtros com um nome; o mesmo nome na mesma tela é substituído. */
export function useSaveFilter(screen: SavedFilterScreen) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; query: string }) =>
      api<SavedFilterRecord>("/api/saved-filters", "Falha ao salvar filtro", {
        method: "POST",
        body: { screen, ...data },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(screen) }),
  });
}

export function useDeleteSavedFilter(screen: SavedFilterScreen) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/saved-filters/${id}`, "Falha ao excluir filtro", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(screen) }),
  });
}
