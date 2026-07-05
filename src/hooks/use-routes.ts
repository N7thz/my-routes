import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RouteRecord, RouteCreateInput, RouteUpdateInput, StopCreateInput, StopRecord } from "@/lib/route-service";

export type { RouteRecord };

// ─── fetchers ─────────────────────────────────────────────────────────────────

async function fetchRoutes(): Promise<RouteRecord[]> {
  const res = await fetch("/api/routes");
  if (!res.ok) throw new Error("Falha ao carregar rotas");
  return res.json();
}

async function createRouteFetch(data: RouteCreateInput): Promise<RouteRecord> {
  const res = await fetch("/api/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Falha ao criar rota");
  return res.json();
}

async function generateRouteFetch(date: string): Promise<RouteRecord> {
  const res = await fetch("/api/routes/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Falha ao gerar rota");
  }
  return res.json();
}

async function updateRouteFetch({ id, data }: { id: string; data: RouteUpdateInput }): Promise<RouteRecord> {
  const res = await fetch(`/api/routes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Falha ao atualizar rota");
  return res.json();
}

async function deleteRouteFetch(id: string): Promise<void> {
  const res = await fetch(`/api/routes/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Falha ao excluir rota");
}

async function addStopFetch({ routeId, data }: { routeId: string; data: StopCreateInput }): Promise<StopRecord> {
  const res = await fetch(`/api/routes/${routeId}/stops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Falha ao adicionar parada");
  return res.json();
}

async function removeStopFetch({ routeId, stopId }: { routeId: string; stopId: string }): Promise<void> {
  const res = await fetch(`/api/routes/${routeId}/stops/${stopId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Falha ao remover parada");
}

async function reorderStopsFetch({ routeId, orderedIds }: { routeId: string; orderedIds: string[] }): Promise<void> {
  const res = await fetch(`/api/routes/${routeId}/stops`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) throw new Error("Falha ao reordenar paradas");
}

async function markVisitedFetch({ routeId, stopId, visited }: { routeId: string; stopId: string; visited: boolean }): Promise<StopRecord> {
  const res = await fetch(`/api/routes/${routeId}/stops/${stopId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visited }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar parada");
  return res.json();
}

// ─── hooks ────────────────────────────────────────────────────────────────────

export function useRoutes() {
  return useQuery<RouteRecord[]>({
    queryKey: ["routes"],
    queryFn: fetchRoutes,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRouteFetch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

export function useGenerateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: generateRouteFetch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

export function useUpdateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateRouteFetch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

export function useDeleteRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRouteFetch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

export function useAddStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addStopFetch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

export function useRemoveStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeStopFetch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

export function useMarkStopVisited() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markVisitedFetch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

export function useReorderStops() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderStopsFetch,
    // update otimista: reordena o cache na hora, com rollback em caso de erro
    onMutate: async ({ routeId, orderedIds }) => {
      await qc.cancelQueries({ queryKey: ["routes"] });
      const prev = qc.getQueryData<RouteRecord[]>(["routes"]);
      qc.setQueryData<RouteRecord[]>(["routes"], (old) =>
        old?.map((r) => {
          if (r.id !== routeId) return r;
          const byId = new Map(r.stops.map((s) => [s.id, s]));
          const reordered = orderedIds
            .map((id, i) => {
              const s = byId.get(id);
              return s ? { ...s, order: i } : null;
            })
            .filter((s): s is StopRecord => s !== null);
          return { ...r, stops: reordered };
        })
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["routes"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}
