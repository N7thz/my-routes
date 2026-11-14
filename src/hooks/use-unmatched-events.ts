import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";
import type { UnmatchedEvent } from "@/lib/route-sync-match";
import type { IgnoredEventTitleRecord } from "@/lib/calendar-ignore-service";

export const UNMATCHED_EVENTS_KEY = ["calendar", "unmatched"] as const;
const IGNORED_TITLES_KEY = ["calendar", "ignored"] as const;

/**
 * Eventos dos próximos dias que não citam nenhuma empresa. Sem Google
 * conectado a API responde 404 com `reason`: aqui isso vira lista vazia
 * (quem avisa da conexão é a sincronização das rotas).
 */
export function useUnmatchedEvents() {
  return useQuery({
    queryKey: UNMATCHED_EVENTS_KEY,
    queryFn: () =>
      api<UnmatchedEvent[]>("/api/calendar/unmatched", "Falha ao buscar eventos da agenda").catch((err) => {
        if (err instanceof ApiError && err.status === 404 && err.reason) return [];
        throw err;
      }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useIgnoredEventTitles(enabled = true) {
  return useQuery({
    queryKey: IGNORED_TITLES_KEY,
    queryFn: () => api<IgnoredEventTitleRecord[]>("/api/calendar/ignored", "Falha ao carregar eventos ignorados"),
    enabled,
  });
}

function useInvalidateCalendarLists() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: UNMATCHED_EVENTS_KEY });
    qc.invalidateQueries({ queryKey: IGNORED_TITLES_KEY });
  };
}

export function useIgnoreEventTitle() {
  return useMutation({
    mutationFn: (label: string) =>
      api<IgnoredEventTitleRecord>("/api/calendar/ignored", "Falha ao ignorar evento", {
        method: "POST",
        body: { label },
      }),
    onSuccess: useInvalidateCalendarLists(),
  });
}

export function useUnignoreEventTitle() {
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/calendar/ignored/${id}`, "Falha ao voltar a considerar o evento", {
        method: "DELETE",
      }),
    onSuccess: useInvalidateCalendarLists(),
  });
}
