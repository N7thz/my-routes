import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ROUTES_KEY } from "@/hooks/use-routes";
import { UNMATCHED_EVENTS_KEY } from "@/hooks/use-unmatched-events";
import type { CalendarRouteSyncResult } from "@/lib/route-sync-service";

/** Intervalo mínimo entre sincronizações automáticas ao abrir a página. */
const AUTO_SYNC_THROTTLE_MS = 5 * 60 * 1000;
const LAST_SYNC_KEY = "my-routes:last-calendar-route-sync";

function lastSyncAt(): number {
  try {
    return Number(localStorage.getItem(LAST_SYNC_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function markSynced() {
  try {
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {
    // localStorage indisponível (modo privado) — só se perde o throttle.
  }
}

/** Falha com `ApiError.reason` de `GoogleUnavailableReason` quando falta o Google. */
function useSyncCalendarRoutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<CalendarRouteSyncResult>(
        "/api/routes/sync-calendar",
        "Falha ao atualizar rotas a partir da agenda",
        { method: "POST" }
      ),
    // Marca ao iniciar (não ao terminar) para duas abas não dispararem juntas.
    onMutate: markSynced,
    onSuccess: (result) => {
      const changed =
        result.routesCreated + result.stopsAdded + result.stopsUpdated + result.stopsRemoved;
      if (changed > 0) queryClient.invalidateQueries({ queryKey: ROUTES_KEY });
      // Empresas novas ou títulos ignorados mudam quais eventos ficam sem empresa.
      queryClient.invalidateQueries({ queryKey: UNMATCHED_EVENTS_KEY });
    },
  });
}

/**
 * Mesma mutação, disparada uma vez ao montar a página — respeitando o throttle.
 * O objeto devolvido é o mesmo da mutação, então o botão manual compartilha o
 * estado de carregamento/erro e ignora o throttle quando chamado direto.
 */
export function useAutoSyncCalendarRoutes() {
  const sync = useSyncCalendarRoutes();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    if (Date.now() - lastSyncAt() < AUTO_SYNC_THROTTLE_MS) return;
    sync.mutate();
  }, [sync]);

  return sync;
}
