import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { RouteRecord, RouteCreateInput, RouteUpdateInput, StopCreateInput, StopRecord } from "@/lib/route-service";

export type { RouteRecord };

export const ROUTES_KEY = ["routes"] as const;

export function useRoutes() {
  return useQuery({
    queryKey: ROUTES_KEY,
    queryFn: () => api<RouteRecord[]>("/api/routes", "Falha ao carregar rotas"),
    staleTime: 2 * 60 * 1000,
  });
}

/** Mutação de rota ou parada: ao terminar bem, a lista de rotas é recarregada. */
function useRouteMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ROUTES_KEY }),
  });
}

export function useCreateRoute() {
  return useRouteMutation((data: RouteCreateInput) =>
    api<RouteRecord>("/api/routes", "Falha ao criar rota", { method: "POST", body: data }),
  );
}

export function useGenerateRoute() {
  return useRouteMutation((date: string) =>
    api<RouteRecord>("/api/routes/generate", "Falha ao gerar rota", {
      method: "POST",
      body: { date },
    }),
  );
}

export function useUpdateRoute() {
  return useRouteMutation(({ id, data }: { id: string; data: RouteUpdateInput }) =>
    api<RouteRecord>(`/api/routes/${id}`, "Falha ao atualizar rota", { method: "PUT", body: data }),
  );
}

export function useDeleteRoute() {
  return useRouteMutation((id: string) => api(`/api/routes/${id}`, "Falha ao excluir rota", { method: "DELETE" }));
}

export function useAddStop() {
  return useRouteMutation(({ routeId, data }: { routeId: string; data: StopCreateInput }) =>
    api<StopRecord>(`/api/routes/${routeId}/stops`, "Falha ao adicionar parada", {
      method: "POST",
      body: data,
    }),
  );
}

export function useRemoveStop() {
  return useRouteMutation(({ routeId, stopId }: { routeId: string; stopId: string }) =>
    api(`/api/routes/${routeId}/stops/${stopId}`, "Falha ao remover parada", { method: "DELETE" }),
  );
}

/**
 * Mutação otimista: `apply` atualiza o cache `[routes]` na hora, o snapshot é
 * restaurado em caso de erro e a lista é recarregada ao final. As mutações
 * pausadas offline são retomadas em providers.tsx.
 */
function useOptimisticRouteMutation<TInput>(
  mutationFn: (input: TInput) => Promise<unknown>,
  apply: (routes: RouteRecord[], input: TInput) => RouteRecord[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (input: TInput) => {
      await qc.cancelQueries({ queryKey: ROUTES_KEY });
      const prev = qc.getQueryData<RouteRecord[]>(ROUTES_KEY);
      qc.setQueryData<RouteRecord[]>(ROUTES_KEY, (old) => (old ? apply(old, input) : old));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ROUTES_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ROUTES_KEY }),
  });
}

export function useMarkStopVisited() {
  return useOptimisticRouteMutation(
    ({ routeId, stopId, visited }: { routeId: string; stopId: string; visited: boolean }) =>
      api<StopRecord>(`/api/routes/${routeId}/stops/${stopId}`, "Falha ao atualizar parada", {
        method: "PATCH",
        body: { visited },
      }),
    (routes, { routeId, stopId, visited }) =>
      routes.map((r) =>
        r.id !== routeId
          ? r
          : {
              ...r,
              stops: r.stops.map((s) =>
                // o cache vem de JSON, então datas são strings (como no retorno da API)
                s.id === stopId
                  ? { ...s, visitedAt: visited ? (new Date().toISOString() as unknown as Date) : null }
                  : s,
              ),
            },
      ),
  );
}

export function useReorderStops() {
  return useOptimisticRouteMutation(
    ({ routeId, orderedIds }: { routeId: string; orderedIds: string[] }) =>
      api(`/api/routes/${routeId}/stops`, "Falha ao reordenar paradas", {
        method: "PATCH",
        body: { orderedIds },
      }),
    (routes, { routeId, orderedIds }) =>
      routes.map((r) => {
        if (r.id !== routeId) return r;
        const byId = new Map(r.stops.map((s) => [s.id, s]));
        const reordered = orderedIds.flatMap((id, order) => {
          const stop = byId.get(id);
          return stop ? [{ ...stop, order }] : [];
        });
        return { ...r, stops: reordered };
      }),
  );
}
