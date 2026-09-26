import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CalendarRouteSyncResult } from "@/lib/route-service";

export type { CalendarRouteSyncResult };

type SyncReason = "not-connected" | "no-calendar-scope" | "unauthenticated";

export class SyncCalendarRoutesError extends Error {
  constructor(public reason: SyncReason) {
    super(reason);
    this.name = "SyncCalendarRoutesError";
  }
}

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
    // localStorage indisponível (modo privado) — só perde o throttle.
  }
}

async function syncCalendarRoutes(): Promise<CalendarRouteSyncResult> {
  const res = await fetch("/api/routes/sync-calendar", { method: "POST" });

  if (res.status === 404 || res.status === 401) {
    const body = (await res.json()) as { reason: SyncReason };
    throw new SyncCalendarRoutesError(body.reason);
  }
  if (!res.ok) throw new Error("Falha ao atualizar rotas a partir da agenda");

  return res.json();
}

export function useSyncCalendarRoutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncCalendarRoutes,
    // Marca ao iniciar (não ao terminar) para duas abas não dispararem juntas.
    onMutate: markSynced,
    onSuccess: (result) => {
      const changed =
        result.routesCreated + result.stopsAdded + result.stopsUpdated + result.stopsRemoved;
      if (changed > 0) queryClient.invalidateQueries({ queryKey: ["routes"] });
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
