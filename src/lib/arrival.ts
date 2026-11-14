// Regras puras do GPS durante a rota (sem DOM nem rede), testáveis com `bun test`:
// quando uma leitura conta como "cheguei na parada" e quando ela entra no trajeto.

export type LatLng = { lat: number; lng: number };
/** Leitura do GPS: posição, precisão em metros e horário (ms). */
export type Fix = LatLng & { accuracy: number; at: number };
export type ArrivalStop = LatLng & { id: string };

export const ARRIVAL = {
  /** Distância até a parada que conta como "no local". */
  radiusMeters: 80,
  /** Leituras mais imprecisas que isso não decidem nada. */
  maxAccuracyMeters: 100,
  /** Tempo seguido no local antes de marcar a visita (passar na frente não conta). */
  dwellMs: 60_000,
};

export const TRACK = {
  /** Distância mínima desde o último ponto gravado. */
  minMeters: 25,
  /** Parado no mesmo lugar, ainda grava um ponto a cada intervalo destes. */
  maxIntervalMs: 2 * 60_000,
  maxAccuracyMeters: 100,
};

export function metersBetween(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Parada mais próxima dentro do raio, ou null. */
export function nearestStopWithin(pos: LatLng, stops: ArrivalStop[], radius: number): ArrivalStop | null {
  let best: ArrivalStop | null = null;
  let bestDistance = radius;
  for (const stop of stops) {
    const distance = metersBetween(pos, stop);
    if (distance <= bestDistance) {
      best = stop;
      bestDistance = distance;
    }
  }
  return best;
}

/** Em qual parada o usuário está e desde quando (null = em nenhuma). */
export type ArrivalState = { stopId: string; since: number } | null;

/**
 * Avança o estado de chegada com uma leitura nova. `arrived` traz a parada
 * quando o usuário ficou `dwellMs` seguidos dentro do raio dela. `stops` deve
 * ter só as paradas ainda não visitadas (e não descartadas pelo usuário).
 */
export function stepArrival(
  state: ArrivalState,
  fix: Fix,
  stops: ArrivalStop[],
  opts = ARRIVAL
): { state: ArrivalState; arrived: string | null } {
  // Leitura ruim: não prova nem que chegou nem que saiu.
  if (fix.accuracy > opts.maxAccuracyMeters) return { state, arrived: null };

  const near = nearestStopWithin(fix, stops, opts.radiusMeters);
  if (!near) return { state: null, arrived: null };

  const next = state?.stopId === near.id ? state : { stopId: near.id, since: fix.at };
  return { state: next, arrived: fix.at - next.since >= opts.dwellMs ? near.id : null };
}

/** A leitura entra no trajeto? (andou o bastante desde o último ponto, ou passou tempo). */
export function shouldRecord(last: Fix | null, fix: Fix, opts = TRACK): boolean {
  if (fix.accuracy > opts.maxAccuracyMeters) return false;
  if (!last) return true;
  return metersBetween(last, fix) >= opts.minMeters || fix.at - last.at >= opts.maxIntervalMs;
}
