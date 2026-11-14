import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type ArrivalState, type Fix, shouldRecord, stepArrival } from "@/lib/arrival";
import { subscribePosition } from "@/lib/geo-watch";
import type { TrackPoint } from "@/lib/route-track-service";

/** Intervalo entre os envios do trajeto para o servidor. */
const FLUSH_INTERVAL_MS = 30_000;
const SETTING_KEY = "my-routes:auto-checkin";

const trackKey = (routeId: string) => ["routes", routeId, "track"] as const;

/** Trajeto gravado de uma rota, para desenhar no mapa. */
export function useRouteTrack(routeId: string | null) {
  return useQuery({
    queryKey: trackKey(routeId ?? ""),
    queryFn: () => api<TrackPoint[]>(`/api/routes/${routeId}/track`, "Falha ao carregar o trajeto"),
    enabled: !!routeId,
    staleTime: 60_000,
  });
}

/**
 * Liga/desliga do check-in automático e do trajeto, por aparelho (no celular faz
 * sentido; no computador, não). Ligado por padrão.
 */
export function useAutoCheckinSetting() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(SETTING_KEY) !== "0");
    } catch {
      // localStorage indisponível: fica o padrão.
    }
  }, []);

  function toggle(next: boolean) {
    setEnabled(next);
    try {
      localStorage.setItem(SETTING_KEY, next ? "1" : "0");
    } catch {
      // só não lembra a escolha.
    }
  }

  return [enabled, toggle] as const;
}

type TrackedStop = { id: string; lat?: number | null; lng?: number | null; visitedAt: unknown };

/**
 * Enquanto `routeId` estiver definido (rota de hoje, em execução): grava o
 * trajeto e chama `onArrive` quando o usuário fica tempo bastante numa parada
 * ainda não visitada. Cada parada dispara no máximo uma vez por sessão, então
 * desfazer a visita não faz ela voltar a ser marcada sozinha.
 */
export function useRouteTracking({
  routeId,
  stops,
  onArrive,
}: {
  routeId: string | null;
  stops: TrackedStop[];
  onArrive: (stopId: string) => void;
}) {
  const queryClient = useQueryClient();
  // Lidos pelo callback do GPS sem reassinar a cada render.
  const stopsRef = useRef(stops);
  stopsRef.current = stops;
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;
  const handledRef = useRef(new Set<string>());

  useEffect(() => {
    if (!routeId) return;

    const url = `/api/routes/${routeId}/track`;
    let buffer: Fix[] = [];
    let lastRecorded: Fix | null = null;
    let arrival: ArrivalState = null;

    const flush = async () => {
      if (buffer.length === 0) return;
      const points = buffer;
      buffer = [];
      try {
        await api(url, "Falha ao gravar o trajeto", { method: "POST", body: { points } });
        queryClient.invalidateQueries({ queryKey: trackKey(routeId) });
      } catch {
        // Sem sinal: os pontos voltam para a fila e vão no próximo envio.
        buffer = [...points, ...buffer];
      }
    };

    // Ao sair ou esconder a página, o beacon entrega o que falta mesmo com a aba fechando.
    const flushBeacon = () => {
      if (buffer.length === 0 || typeof navigator.sendBeacon !== "function") return;
      const body = new Blob([JSON.stringify({ points: buffer })], { type: "application/json" });
      if (navigator.sendBeacon(url, body)) buffer = [];
    };
    const onVisibility = () => document.visibilityState === "hidden" && flushBeacon();

    const unsubscribe = subscribePosition((fix) => {
      if (shouldRecord(lastRecorded, fix)) {
        buffer.push(fix);
        lastRecorded = fix;
      }

      const pending = stopsRef.current.flatMap((s) =>
        !s.visitedAt && !handledRef.current.has(s.id) && typeof s.lat === "number" && typeof s.lng === "number"
          ? [{ id: s.id, lat: s.lat, lng: s.lng }]
          : [],
      );
      const step = stepArrival(arrival, fix, pending);
      arrival = step.state;
      if (step.arrived) {
        handledRef.current.add(step.arrived);
        arrival = null;
        onArriveRef.current(step.arrived);
      }
    });

    const timer = setInterval(flush, FLUSH_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushBeacon);

    return () => {
      unsubscribe();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushBeacon);
      void flush();
    };
  }, [routeId, queryClient]);
}
