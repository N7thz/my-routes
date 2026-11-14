"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { MapPinIcon, Loader2Icon, LocateFixedIcon, LocateIcon } from "lucide-react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { Button } from "@/components/ui/button";
import { type LatLng, useRouteLine } from "@/hooks/use-route-line";

type Stop = {
  address: string;
  label?: string | null;
  visitedAt: Date | string | null;
  lat?: number | null;
  lng?: number | null;
};

// Estilos do MapTiler (plano Free) quando há chave; sem ela, cai nos tiles da
// OpenFreeMap (grátis, sem chave e sem limite de acessos).
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const maptilerStyle = (id: string) => `https://api.maptiler.com/maps/${id}/style.json?key=${MAPTILER_KEY}`;
// Estilos neutros (dataviz / positron): o mapa fica em cinza e a rota é o que aparece (DESIGN.md).
const STYLE_LIGHT = MAPTILER_KEY ? maptilerStyle("dataviz-v4") : "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = MAPTILER_KEY ? maptilerStyle("dataviz-v4-dark") : "https://tiles.openfreemap.org/styles/dark";
// Copiado para public/ no postinstall (ver scripts/copy-maplibre-worker.mjs).
const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

const ROUTE_SOURCE = "route-line";
const ACCURACY_SOURCE = "user-accuracy";

/** Cores do mapa por tema: monocromático, verde só para "visitada". */
type MapPalette = {
  ink: string;
  paper: string;
  pending: string;
  visited: string;
  line: string;
  accuracy: string;
};
const PALETTE: Record<"dark" | "light", MapPalette> = {
  dark: {
    ink: "#ffffff",
    paper: "#000000",
    pending: "#3f3f46",
    visited: "#10b981",
    line: "rgba(255,255,255,0.85)",
    accuracy: "#ffffff",
  },
  light: {
    ink: "#000000",
    paper: "#ffffff",
    pending: "#a1a1aa",
    visited: "#059669",
    line: "rgba(0,0,0,0.8)",
    accuracy: "#000000",
  },
};
const FIT_PADDING = 48;
/** Abaixo disso o GPS só oscila parado: não vale mexer no mapa. */
const MIN_MOVE_METERS = 8;

type MapLibreModule = typeof import("maplibre-gl");
let maplibrePromise: Promise<MapLibreModule> | null = null;

/** Carrega o MapLibre uma vez só, fora do bundle inicial da página. */
function loadMapLibre(): Promise<MapLibreModule> {
  maplibrePromise ??= import("maplibre-gl").then((m) => {
    m.setWorkerUrl(WORKER_URL);
    return m;
  });
  return maplibrePromise;
}

function located(stops: Stop[]): (Stop & LatLng & { index: number })[] {
  return stops.flatMap((s, index) =>
    typeof s.lat === "number" && typeof s.lng === "number" ? [{ ...s, lat: s.lat, lng: s.lng, index }] : [],
  );
}

function metersBetween(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Polígono do círculo de precisão do GPS (o MapLibre não tem círculo em metros). */
function accuracyPolygon({ lat, lng }: LatLng, radius: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 48;
  const dLat = radius / 111_320;
  const dLng = radius / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring = Array.from({ length: points + 1 }, (_, i) => {
    const t = (i / points) * 2 * Math.PI;
    return [lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)];
  });
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

function NoDataFallback({ stops }: { stops: Stop[] }) {
  const url = `https://www.google.com/maps/dir/${stops.map((s) => encodeURIComponent(s.address)).join("/")}`;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center">
      <MapPinIcon className="size-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">
        {stops.length === 0 ? "Nenhuma parada nesta rota." : "Nenhuma parada com endereço localizado no mapa."}
      </p>
      {stops.length > 0 && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center rounded-full border-[1.5px] border-input px-4 text-sm font-semibold transition-colors hover:bg-accent"
        >
          Abrir rota no Google Maps
        </a>
      )}
    </div>
  );
}

function stopElement(
  label: string,
  { background, color, border }: { background: string; color: string; border: string },
  opacity: number,
): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `width:32px;height:32px;border-radius:50%;background:${background};border:2.5px solid ${border};
    box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;
    color:${color};font:700 12px/1 var(--font-general-sans, system-ui), sans-serif;font-variant-numeric:tabular-nums;
    opacity:${opacity};cursor:pointer;`;
  el.textContent = label;
  return el;
}

function userElement(p: MapPalette, imageUrl?: string | null): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center;";
  const pulse = document.createElement("div");
  pulse.style.cssText = `position:absolute;inset:0;border-radius:50%;background:color-mix(in srgb, ${p.ink} 15%, transparent);
    border:2px solid color-mix(in srgb, ${p.ink} 40%, transparent);animation:userPulse 2s ease-out infinite;`;
  wrap.appendChild(pulse);

  const dot = document.createElement("div");
  dot.style.cssText = `width:14px;height:14px;border-radius:50%;background:${p.ink};border:2.5px solid ${p.paper};
    box-shadow:0 2px 6px rgba(0,0,0,0.35);position:relative;`;

  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = "Você";
    img.style.cssText = `width:36px;height:36px;border-radius:50%;border:2.5px solid ${p.ink};
      box-shadow:0 2px 8px rgba(0,0,0,0.4);object-fit:cover;position:relative;display:block;`;
    img.onerror = () => img.replaceWith(dot);
    wrap.appendChild(img);
  } else {
    wrap.appendChild(dot);
  }
  return wrap;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Círculo de precisão do GPS como camada GeoJSON (some ao trocar o estilo; é redesenhado). */
function drawAccuracy(map: MapLibreMap, pos: LatLng & { accuracy: number }, color: string) {
  if (!map.isStyleLoaded()) return;
  const data = accuracyPolygon(pos, pos.accuracy);
  const source = map.getSource<GeoJSONSource>(ACCURACY_SOURCE);
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource(ACCURACY_SOURCE, { type: "geojson", data });
  map.addLayer({
    id: `${ACCURACY_SOURCE}-fill`,
    type: "fill",
    source: ACCURACY_SOURCE,
    paint: { "fill-color": color, "fill-opacity": 0.08 },
  });
  map.addLayer({
    id: `${ACCURACY_SOURCE}-line`,
    type: "line",
    source: ACCURACY_SOURCE,
    paint: { "line-color": color, "line-opacity": 0.5, "line-width": 1, "line-dasharray": [3, 3] },
  });
}

export function RouteMap({ stops, dark, userImage }: { stops: Stop[]; dark?: boolean; userImage?: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<MapLibreModule | null>(null);
  const stopMarkersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const lastUserPosRef = useRef<(LatLng & { accuracy: number }) | null>(null);
  const followingRef = useRef(false);
  const styleUrlRef = useRef<string | null>(null);
  const fittedKeyRef = useRef("");

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasUserPos, setHasUserPos] = useState(false);
  const [following, setFollowing] = useState(false);

  const points = located(stops);
  const routeLine = useRouteLine(points);
  const styleUrl = dark ? STYLE_DARK : STYLE_LIGHT;
  const palette = PALETTE[dark ? "dark" : "light"];
  // Lido pelos callbacks do GPS e pelos efeitos de camada sem reassinar nada.
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  // Mapa: criado uma vez; o tema só troca o estilo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o mapa é criado uma vez; o tema muda pelo efeito abaixo
  useEffect(() => {
    let cancelled = false;
    loadMapLibre()
      .then((lib) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        libRef.current = lib;
        const map = new lib.Map({
          container: containerRef.current,
          style: styleUrl,
          center: [-46.63, -23.55],
          zoom: 10,
          attributionControl: { compact: true },
          maxZoom: 19,
          // Gira só com dois dedos de propósito; no dia a dia atrapalha mais do que ajuda.
          dragRotate: false,
          pitchWithRotate: false,
        });
        styleUrlRef.current = styleUrl;
        // Conta a sessão de mapa do MapTiler para a página de admin (cota mensal).
        if (MAPTILER_KEY) void fetch("/api/usage/maptiler", { method: "POST" }).catch(() => {});
        map.addControl(new lib.NavigationControl({ showCompass: false }), "top-left");
        // Arrastar o mapa desliga o "seguir minha posição".
        map.on("dragstart", () => {
          followingRef.current = false;
          setFollowing(false);
        });
        map.once("load", () => !cancelled && setReady(true));
        map.on("error", (e) => console.warn("[route-map]", e.error?.message));
        mapRef.current = map;
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      stopMarkersRef.current = [];
      userMarkerRef.current = null;
    };
  }, []);

  // Troca de tema: novo estilo, e as camadas próprias voltam quando ele carregar.
  const [styleGen, setStyleGen] = useState(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || styleUrlRef.current === styleUrl) return;
    styleUrlRef.current = styleUrl;
    map.setStyle(styleUrl);
    map.once("style.load", () => setStyleGen((g) => g + 1));
  }, [styleUrl, ready]);

  // Paradas: marcadores DOM (sobrevivem à troca de estilo).
  const stopsKey = stops.map((s) => `${s.lat},${s.lng},${s.visitedAt ? 1 : 0},${s.label ?? ""}`).join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: stopsKey resume as paradas; fitRoute só lê refs
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !ready) return;

    for (const m of stopMarkersRef.current) m.remove();
    const firstPending = stops.findIndex((s) => !s.visitedAt);
    stopMarkersRef.current = located(stops).map((stop) => {
      const visited = !!stop.visitedAt;
      const colors = visited
        ? { background: palette.visited, color: "#ffffff", border: palette.paper }
        : stop.index === firstPending
          ? { background: palette.ink, color: palette.paper, border: palette.paper }
          : { background: palette.pending, color: "#ffffff", border: palette.paper };
      const popup = new lib.Popup({ offset: 18, closeButton: false }).setHTML(
        `<div style="font-size:13px;line-height:1.5;color:#111">
          <strong>${escapeHtml(stop.label ?? `Parada ${stop.index + 1}`)}</strong><br/>
          <span style="color:rgba(0,0,0,0.6);font-size:12px">${escapeHtml(stop.address)}</span>
        </div>`,
      );
      return new lib.Marker({
        element: stopElement(visited ? "✓" : String(stop.index + 1), colors, visited ? 0.75 : 1),
      })
        .setLngLat([stop.lng, stop.lat])
        .setPopup(popup)
        .addTo(map);
    });
    // Reenquadra só quando os pontos mudam, não ao marcar uma parada como visitada.
    const fitKey = located(stops)
      .map((p) => `${p.lng},${p.lat}`)
      .join(";");
    if (fitKey !== fittedKeyRef.current) {
      fittedKeyRef.current = fitKey;
      fitRoute(false);
    }
  }, [stopsKey, ready, dark]);

  // Linha da rota (camada GeoJSON), refeita também depois de trocar o estilo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: styleGen dispara o redesenho após trocar o tema
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.isStyleLoaded()) return;
    const coordinates = routeLine.data?.coordinates ?? [];
    const data: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    };
    const source = map.getSource<GeoJSONSource>(ROUTE_SOURCE);
    if (source) {
      source.setData(data);
      return;
    }
    map.addSource(ROUTE_SOURCE, { type: "geojson", data });
    map.addLayer({
      id: ROUTE_SOURCE,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": paletteRef.current.line, "line-width": 4 },
    });
  }, [routeLine.data, ready, styleGen]);

  // GPS: atualiza o marcador direto no mapa, sem re-render do React a cada leitura.
  useEffect(() => {
    if (!ready || typeof navigator === "undefined" || !navigator.geolocation) return;
    const lib = libRef.current;
    const map = mapRef.current;
    if (!lib || !map) return;

    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
        const last = lastUserPosRef.current;
        if (
          last &&
          metersBetween(last, pos) < MIN_MOVE_METERS &&
          Math.abs(last.accuracy - pos.accuracy) < MIN_MOVE_METERS
        ) {
          return;
        }
        lastUserPosRef.current = pos;

        if (!userMarkerRef.current) {
          userMarkerRef.current = new lib.Marker({ element: userElement(paletteRef.current, userImage) })
            .setLngLat([pos.lng, pos.lat])
            .addTo(map);
          setHasUserPos(true);
        } else {
          userMarkerRef.current.setLngLat([pos.lng, pos.lat]);
        }
        drawAccuracy(map, pos, paletteRef.current.accuracy);
        if (followingRef.current) map.easeTo({ center: [pos.lng, pos.lat], duration: 500 });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [ready, userImage]);

  // Troca de tema: o círculo de precisão (camada de estilo) é redesenhado e o
  // marcador do usuário ganha as cores novas.
  // biome-ignore lint/correctness/useExhaustiveDependencies: styleGen marca o estilo novo carregado
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    const pos = lastUserPosRef.current;
    if (!map || !lib || !pos || styleGen === 0) return;
    drawAccuracy(map, pos, paletteRef.current.accuracy);
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = new lib.Marker({ element: userElement(paletteRef.current, userImage) })
        .setLngLat([pos.lng, pos.lat])
        .addTo(map);
    }
  }, [styleGen]);

  function fitRoute(animate = true) {
    const map = mapRef.current;
    const lib = libRef.current;
    const pts = located(stops);
    if (!map || !lib || pts.length === 0) return;
    followingRef.current = false;
    setFollowing(false);
    if (pts.length === 1) {
      map.jumpTo({ center: [pts[0].lng, pts[0].lat], zoom: 15 });
      return;
    }
    const bounds = new lib.LngLatBounds();
    for (const p of pts) bounds.extend([p.lng, p.lat]);
    map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: 15, animate });
  }

  function toggleFollow() {
    const map = mapRef.current;
    const pos = lastUserPosRef.current;
    if (following) {
      followingRef.current = false;
      setFollowing(false);
      return;
    }
    if (!map || !pos) return;
    followingRef.current = true;
    setFollowing(true);
    map.flyTo({ center: [pos.lng, pos.lat], zoom: 16, duration: 1000 });
  }

  if (failed || points.length === 0) return <NoDataFallback stops={stops} />;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {(!ready || routeLine.isFetching) && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur">
            <Loader2Icon className="size-3.5 animate-spin" />
            {ready ? "Calculando rota…" : "Carregando mapa…"}
          </div>
        </div>
      )}

      {ready && (
        <div className="absolute bottom-8 right-3 z-10 flex flex-col gap-2">
          <Button
            size="icon"
            variant="secondary"
            onClick={() => fitRoute()}
            className="size-10 shadow-md"
            title="Ver rota completa"
            aria-label="Ver rota completa"
          >
            <MapPinIcon className="size-4" />
          </Button>

          {hasUserPos && (
            <Button
              size="icon"
              variant={following ? "default" : "secondary"}
              onClick={toggleFollow}
              className="size-10 shadow-md"
              title={following ? "Parar de seguir" : "Minha localização"}
              aria-label={following ? "Parar de seguir" : "Minha localização"}
            >
              {following ? <LocateFixedIcon className="size-4" /> : <LocateIcon className="size-4" />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
