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
