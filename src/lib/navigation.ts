/**
 * Links para abrir a navegação até uma parada no app de mapas do celular.
 * Com coordenadas o destino é exato; sem elas, vai pelo endereço.
 */
export type NavTarget = { address: string; lat?: number | null; lng?: number | null };

export type NavApp = "google" | "waze";

function hasCoords(t: NavTarget): t is NavTarget & { lat: number; lng: number } {
  return typeof t.lat === "number" && typeof t.lng === "number";
}

/** Google Maps já em modo rota, saindo da posição atual. */
export function googleMapsNavUrl(target: NavTarget): string {
  const destination = hasCoords(target) ? `${target.lat},${target.lng}` : target.address;
  return `https://www.google.com/maps/dir/?${new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
  })}`;
}

/** Waze com navegação iniciada (abre o app se instalado, senão o site). */
export function wazeNavUrl(target: NavTarget): string {
  const params: Record<string, string> = hasCoords(target)
    ? { ll: `${target.lat},${target.lng}`, navigate: "yes" }
    : { q: target.address, navigate: "yes" };
  return `https://waze.com/ul?${new URLSearchParams(params)}`;
}

export function navUrl(app: NavApp, target: NavTarget): string {
  return app === "waze" ? wazeNavUrl(target) : googleMapsNavUrl(target);
}

/**
 * Rota inteira no Google Maps (origem = posição atual). O Maps aceita até 9
 * pontos intermediários pela URL; acima disso, só as próximas paradas entram.
 */
export const MAX_GOOGLE_WAYPOINTS = 9;

export function googleMapsRouteUrl(targets: NavTarget[]): string | null {
  if (targets.length === 0) return null;
  const point = (t: NavTarget) => (hasCoords(t) ? `${t.lat},${t.lng}` : t.address);
  const capped = targets.slice(0, MAX_GOOGLE_WAYPOINTS + 1);
  const destination = capped[capped.length - 1];
  const waypoints = capped.slice(0, -1);
  return `https://www.google.com/maps/dir/?${new URLSearchParams({
    api: "1",
    destination: point(destination),
    travelmode: "driving",
    ...(waypoints.length > 0 && { waypoints: waypoints.map(point).join("|") }),
  })}`;
}

/** Primeira parada ainda não visitada, na ordem da rota. */
export function nextStop<T extends { visitedAt: Date | string | null }>(stops: T[]): T | null {
  return stops.find((s) => !s.visitedAt) ?? null;
}

/** Preferência de app de navegação, lembrada no aparelho. */
const NAV_APP_KEY = "my-routes:nav-app";

export function getPreferredNavApp(): NavApp {
  try {
    return localStorage.getItem(NAV_APP_KEY) === "waze" ? "waze" : "google";
  } catch {
    return "google";
  }
}

export function setPreferredNavApp(app: NavApp): void {
  try {
    localStorage.setItem(NAV_APP_KEY, app);
  } catch {
    /* sem storage (aba privada): fica só nesta sessão */
  }
}
