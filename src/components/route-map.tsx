"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinIcon, Loader2Icon, LocateFixedIcon, LocateIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type Stop = { address: string; visitedAt: Date | string | null };
type LatLng = { lat: number; lng: number };
type UserPos = { lat: number; lng: number; accuracy: number };

// ── Geocode via Nominatim (OpenStreetMap, free, no key) ───────────────────────

const geocodeCache = new Map<string, LatLng | null>();

async function geocode(address: string): Promise<LatLng | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!;
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({ q: address, format: "json", limit: "1", countrycodes: "br" });
    const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
    const data = await res.json();
    if (!data[0]) { geocodeCache.set(address, null); return null; }
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geocodeCache.set(address, result);
    return result;
  } catch {
    geocodeCache.set(address, null);
    return null;
  }
}

// ── OSRM route (free, no key) ─────────────────────────────────────────────────

async function fetchOsrmRoute(points: LatLng[]): Promise<[number, number][] | null> {
  if (points.length < 2) return null;
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok") return null;
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
  } catch {
    return null;
  }
}

// ── Fallback ──────────────────────────────────────────────────────────────────

function NoDataFallback({ stops }: { stops: Stop[] }) {
  const url = `https://www.google.com/maps/dir/${stops.map((s) => encodeURIComponent(s.address)).join("/")}`;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center">
      <MapPinIcon className="size-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Não foi possível exibir o mapa.</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
        Ver rota no Google Maps →
      </a>
    </div>
  );
}

// ── Marker helpers ────────────────────────────────────────────────────────────

const STOP_COLORS = { visited: "#10b981", current: "#6366f1", pending: "#71717a" };

function stopIconHtml(label: string | number, color: string, opacity = 1) {
  return `<div style="
    width:32px;height:32px;border-radius:50%;
    background:${color};border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    color:white;font-size:12px;font-weight:700;
    opacity:${opacity};
  ">${label}</div>`;
}

function userIconHtml(imageUrl?: string | null) {
  const inner = imageUrl
    ? `<img
        src="${imageUrl}"
        style="width:36px;height:36px;border-radius:50%;border:2.5px solid white;
               box-shadow:0 2px 8px rgba(0,0,0,0.4);object-fit:cover;
               position:relative;z-index:1;display:block;"
        onerror="this.style.display='none';document.getElementById('user-dot-fallback').style.display='flex';"
      />
      <div id="user-dot-fallback" style="display:none;width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);position:relative;z-index:1;"></div>`
    : `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);position:relative;z-index:1;"></div>`;

  return `<div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center">
    <div style="
      position:absolute;inset:0;border-radius:50%;
      background:rgba(59,130,246,0.2);border:2px solid rgba(59,130,246,0.45);
      animation:userPulse 2s ease-out infinite;
    "></div>
    ${inner}
  </div>`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RouteMap({ stops, dark, userImage }: { stops: Stop[]; dark?: boolean; userImage?: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const routeLayersRef = useRef<import("leaflet").Layer[]>([]);
  const userMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const accuracyCircleRef = useRef<import("leaflet").Circle | null>(null);

  const [mapState, setMapState] = useState<"idle" | "loading" | "error">("idle");
  const [userPos, setUserPos] = useState<UserPos | null>(null);
  const [following, setFollowing] = useState(false);
  const prevStopsKeyRef = useRef("");
  const prevDarkRef = useRef<boolean | undefined>(undefined);

  // ── Watch user geolocation ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      ({ coords }) =>
        setUserPos({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── Update user marker when position changes ───────────────────────────────
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !userPos) return;

    const { lat, lng, accuracy } = userPos;
    const latlng: [number, number] = [lat, lng];

    const icon = L.divIcon({ html: userIconHtml(userImage), className: "", iconSize: [42, 42], iconAnchor: [21, 21] });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(latlng, { icon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup("<strong>Você está aqui</strong>");
      accuracyCircleRef.current = L.circle(latlng, {
        radius: accuracy,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.08,
        weight: 1,
        dashArray: "5 5",
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(latlng).setIcon(icon);
      accuracyCircleRef.current?.setLatLng(latlng);
      accuracyCircleRef.current?.setRadius(accuracy);
    }

    if (following) map.panTo(latlng, { animate: true, duration: 0.5 });
  }, [userPos, following, userImage]);

  // ── Initialise map + draw route when stops or dark mode changes ────────────
  useEffect(() => {
    if (!containerRef.current || stops.length === 0) return;

    const stopsKey = stops.map((s) => s.address + (s.visitedAt ? "v" : "")).join("|");
    const darkChanged = dark !== prevDarkRef.current;
    if (stopsKey === prevStopsKeyRef.current && !darkChanged && mapRef.current) return;

    prevStopsKeyRef.current = stopsKey;
    prevDarkRef.current = dark;
    setMapState("loading");

    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      LRef.current = L;

      // Fix broken icon URLs in bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled) return;

      // Create or reuse map
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current!, { zoomControl: true });
      }
      const map = mapRef.current;

      // Update tile layer on dark mode change
      map.eachLayer((l) => { if ((l as { _url?: string })._url) map.removeLayer(l); });
      L.tileLayer(
        dark
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      // Remove previous route layers (keep user marker)
      routeLayersRef.current.forEach((l) => map.removeLayer(l));
      routeLayersRef.current = [];

      // Geocode all addresses
      const points = await Promise.all(stops.map((s) => geocode(s.address)));
      if (cancelled) return;

      const validPoints = points.filter(Boolean) as LatLng[];
      if (validPoints.length === 0) { setMapState("error"); return; }

      // Draw route polyline via OSRM
      if (validPoints.length >= 2) {
        const routeCoords = await fetchOsrmRoute(validPoints);
        if (!cancelled && routeCoords) {
          const polyline = L.polyline(routeCoords, { color: "#6366f1", weight: 5, opacity: 0.85 }).addTo(map);
          routeLayersRef.current.push(polyline);
        }
      }

      // Stop markers
      const firstUnvisited = stops.findIndex((s) => !s.visitedAt);
      validPoints.forEach((pt, i) => {
        if (!pt) return;
        const stop = stops[i];
        const visited = !!stop.visitedAt;
        const isCurrent = i === firstUnvisited;
        const color = visited ? STOP_COLORS.visited : isCurrent ? STOP_COLORS.current : STOP_COLORS.pending;
        const label = visited ? "✓" : String(i + 1);
        const opacity = visited ? 0.7 : 1;

        const icon = L.divIcon({
          html: stopIconHtml(label, color, opacity),
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const stopLabel = (stop as { label?: string | null }).label;
        const popup = `<div style="font-size:13px;line-height:1.5">
          <strong>${stopLabel ?? `Parada ${i + 1}`}</strong><br/>
          <span style="color:#888;font-size:11px">${stop.address}</span>
        </div>`;

        const marker = L.marker([pt.lat, pt.lng], { icon }).addTo(map).bindPopup(popup);
        routeLayersRef.current.push(marker);
      });

      // Fit bounds to route
      const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

      setMapState("idle");
    }

    init();
    return () => { cancelled = true; };
  }, [stops, dark]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        prevStopsKeyRef.current = "";
      }
    };
  }, []);

  function centerOnUser() {
    if (!mapRef.current || !userPos) return;
    setFollowing(true);
    mapRef.current.flyTo([userPos.lat, userPos.lng], 16, { duration: 1 });
  }

  function fitRoute() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || routeLayersRef.current.length === 0) return;
    setFollowing(false);
    const group = L.featureGroup(routeLayersRef.current);
    map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 15 });
  }

  if (stops.length === 0) return <NoDataFallback stops={stops} />;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Loading overlay */}
      {mapState === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-[1001]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Calculando rota…
          </div>
        </div>
      )}

      {mapState === "error" && <NoDataFallback stops={stops} />}

      {/* Map controls overlay */}
      {mapState === "idle" && (
        <div className="absolute bottom-5 right-3 z-[1001] flex flex-col gap-2">
          {/* Fit route */}
          <Button
            size="icon"
            variant="secondary"
            onClick={fitRoute}
            className="size-9 shadow-md"
            title="Ver rota completa"
          >
            <MapPinIcon className="size-4" />
          </Button>

          {/* Center on user */}
          {userPos && (
            <Button
              size="icon"
              variant={following ? "default" : "secondary"}
              onClick={following ? () => setFollowing(false) : centerOnUser}
              className="size-9 shadow-md"
              title={following ? "Parar de seguir" : "Minha localização"}
            >
              {following ? (
                <LocateFixedIcon className="size-4" />
              ) : (
                <LocateIcon className="size-4" />
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
