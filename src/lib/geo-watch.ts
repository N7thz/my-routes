import type { Fix } from "@/lib/arrival";

// Um único `watchPosition` para a página toda: o mapa e o rastreamento da rota
// assinam a mesma leitura em vez de cada um ligar o GPS por conta própria.

type Listener = (fix: Fix) => void;

const listeners = new Set<Listener>();
let watchId: number | null = null;
let lastFix: Fix | null = null;

/** Assina as leituras do GPS; devolve a função que cancela. Sem GPS, não faz nada. */
export function subscribePosition(listener: Listener): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) return () => {};

  listeners.add(listener);
  if (lastFix) listener(lastFix);
  if (watchId === null) {
    watchId = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        lastFix = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, at: timestamp };
        for (const l of listeners) l(lastFix);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };
}
