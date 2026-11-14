"use client";

import { useQuery } from "@tanstack/react-query";

export type LatLng = { lat: number; lng: number };

export type RouteLine = {
  /** Linha pelas ruas, em [lng, lat]. */
  coordinates: [number, number][];
  /** Distância total em metros. */
  distance: number;
  /** Tempo de deslocamento estimado em segundos (sem contar o tempo nas visitas). */
  duration: number;
};

async function fetchOsrmRoute(points: LatLng[]): Promise<RouteLine | null> {
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.code !== "Ok") return null;
  const route = data.routes[0];
  return { coordinates: route.geometry.coordinates, distance: route.distance, duration: route.duration };
}

/**
 * Rota pelas ruas (OSRM público, grátis) entre os pontos, na ordem dada. Fica no
 * cache do React Query (persistido no aparelho): o mapa e o resumo do painel
 * compartilham a mesma busca, e abrir de novo com as mesmas paradas não chama o OSRM.
 */
export function useRouteLine(points: LatLng[]) {
  const key = points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
  return useQuery({
    // "v2": o formato mudou (antes só as coordenadas); evita ler o cache antigo.
    queryKey: ["route-line", "v2", key],
    queryFn: () => fetchOsrmRoute(points),
    enabled: points.length >= 2,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    retry: 1,
  });
}

/** Paradas com coordenadas, na ordem da rota. */
export function locatedPoints(stops: { lat?: number | null; lng?: number | null }[]): LatLng[] {
  return stops.flatMap((s) =>
    typeof s.lat === "number" && typeof s.lng === "number" ? [{ lat: s.lat, lng: s.lng }] : [],
  );
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = meters / 1000;
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

export function formatDuration(seconds: number): string {
  const min = Math.max(1, Math.round(seconds / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}
