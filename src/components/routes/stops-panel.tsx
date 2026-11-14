"use client";

import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import type { RouteRecord, RouteStatus } from "@/lib/route-service";
import { ArrowDownUpIcon, CircleCheckBigIcon, ExternalLinkIcon, PlayIcon, WifiOffIcon } from "lucide-react";
import { googleMapsRouteUrl, MAX_GOOGLE_WAYPOINTS } from "@/lib/navigation";
import { formatDistance, formatDuration, locatedPoints, useRouteLine } from "@/hooks/use-route-line";
import { Button } from "@/components/ui/button";
import { visitedTimeLabel } from "./day-labels";
import { StopItem } from "./stop-item";

export function ProgressBar({ progress, className }: { progress: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso da rota"
      className={cn("overflow-hidden rounded-full bg-foreground/15", className)}
    >
      <div
        className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** "7 paradas · 42 km · ~1h50 de deslocamento", com o OSRM que o mapa também usa. */
function RouteSummary({ route }: { route: RouteRecord }) {
  const line = useRouteLine(locatedPoints(route.stops));
  const count = route.stops.length;
  const parts = [`${count} ${count === 1 ? "parada" : "paradas"}`];
  if (line.data && line.data.distance >= 100) {
    parts.push(formatDistance(line.data.distance), `~${formatDuration(line.data.duration)} de deslocamento`);
  }
  return (
    <p className="text-sm font-semibold tabular-nums">
      {parts.join(" · ")}
      {line.isFetching && !line.data && (
        <span className="font-normal text-muted-foreground"> · calculando distância…</span>
      )}
    </p>
  );
}

/**
 * Coluna com a linha do tempo de paradas. "run": dia de hoje (ou passado), com a
 * próxima parada em destaque e um botão principal que acompanha o andamento.
 * "plan": dia futuro ou sem data, só o roteiro e o resumo.
 */
export function StopsPanel({
  route,
  mode,
  visibleOnMobile,
  loadingStopId,
  onToggle,
  onMove,
  onReorder,
  onManage,
  onStatusChange,
}: {
  route: RouteRecord;
  mode: "run" | "plan";
  visibleOnMobile: boolean;
  loadingStopId: string | null;
  onToggle: (stopId: string, visited: boolean) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onReorder: (from: number, to: number) => void;
  onManage: () => void;
  onStatusChange: (status: RouteStatus) => void;
}) {
  const online = useOnline();
  const [reordering, setReordering] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const totalCount = route.stops.length;
  const visitedCount = route.stops.filter((s) => s.visitedAt).length;
  const progress = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;
  const allVisited = totalCount > 0 && visitedCount === totalCount;
  const firstUnvisitedIndex = mode === "run" ? route.stops.findIndex((s) => !s.visitedAt) : -1;
  const remaining = route.stops.filter((s) => !s.visitedAt && s.address);
  const routeUrl = googleMapsRouteUrl(remaining);
  const shownInMaps = Math.min(remaining.length, MAX_GOOGLE_WAYPOINTS + 1);
  const lastVisit = route.stops.reduce<string | null>((last, s) => {
    if (!s.visitedAt) return last;
    const t = new Date(s.visitedAt).toISOString();
    return !last || t > last ? t : last;
  }, null);

  function endDrag() {
    setDragFrom(null);
    setDragOver(null);
  }

  // Arrastar só com mouse/caneta (HTML5 drag); no toque ficam as setas.
  function dragHandlers(i: number): React.HTMLAttributes<HTMLDivElement> {
    return {
      draggable: true,
      onDragStart: (e) => {
        e.dataTransfer.effectAllowed = "move";
        setDragFrom(i);
      },
      onDragOver: (e) => {
        if (dragFrom === null) return;
        e.preventDefault();
        if (dragOver !== i) setDragOver(i);
      },
      onDrop: (e) => {
        e.preventDefault();
        if (dragFrom !== null && dragFrom !== i) onReorder(dragFrom, i);
        endDrag();
      },
      onDragEnd: endDrag,
    };
  }

  const mapsLink = routeUrl && (
    <a
      href={routeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-10 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-input px-4 text-sm font-semibold transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <ExternalLinkIcon className="size-4" />
      {remaining.length > shownInMaps
        ? `Próximas ${shownInMaps} no Google Maps`
        : mode === "plan"
          ? "Abrir no Google Maps"
          : `${shownInMaps === 1 ? "Parada restante" : `${shownInMaps} restantes`} no Google Maps`}
    </a>
  );

  return (
    <div
      className={cn(
        "w-full min-h-0 shrink-0 flex-col sm:flex sm:w-96 sm:border-r",
        visibleOnMobile ? "flex" : "hidden",
      )}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <RouteSummary route={route} />
          {totalCount > 1 && (
            <Button
              variant={reordering ? "secondary" : "ghost"}
              size="sm"
              className="shrink-0"
              aria-pressed={reordering}
              onClick={() => setReordering((r) => !r)}
            >
              <ArrowDownUpIcon />
              {reordering ? "Pronto" : "Reordenar"}
            </Button>
          )}
        </div>
        {mode === "run" && totalCount > 0 && (
          <div className="flex items-center gap-3">
            <ProgressBar progress={progress} className="h-1.5 flex-1" />
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {visitedCount} de {totalCount} visitadas
            </span>
          </div>
        )}
        {reordering && (
          <p className="text-xs text-muted-foreground">
            Arraste as paradas ou use as setas. Dá para desfazer a última mudança.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-sm font-medium">Esta rota ainda não tem paradas</p>
            <p className="text-sm text-muted-foreground">
              Adicione empresas em Gerenciar rotas ou use Ações › Gerar rota agora.
            </p>
            <Button variant="outline" size="sm" onClick={onManage}>
              Gerenciar rotas
            </Button>
          </div>
        ) : (
          route.stops.map((stop, i) => (
            <StopItem
              key={stop.id}
              stop={stop}
              index={i}
              isLast={i === totalCount - 1}
              isCurrent={i === firstUnvisitedIndex}
              isLoading={loadingStopId === stop.id}
              reordering={reordering}
              dragState={dragFrom === i ? "dragging" : dragOver === i && dragFrom !== null ? "over" : undefined}
              onToggle={() => onToggle(stop.id, !stop.visitedAt)}
              onMove={(dir) => onMove(i, dir)}
              onFixAddress={onManage}
              dragHandlers={dragHandlers(i)}
            />
          ))
        )}
      </div>

      {totalCount > 0 && (
        <div className="flex shrink-0 flex-col gap-3 border-t px-4 py-3">
          {!online && (
            <p role="status" className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <WifiOffIcon className="mt-px size-3.5 shrink-0" />
              Sem sinal: a rota está salva no aparelho. As visitas marcadas agora são enviadas quando a conexão voltar.
            </p>
          )}

          {reordering ? (
            <Button onClick={() => setReordering(false)} className="w-full">
              Concluir reordenação
            </Button>
          ) : mode === "plan" ? (
            mapsLink
          ) : allVisited ? (
            <div
              role="status"
              className="flex flex-col gap-3 transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0"
            >
              <div className="flex items-start gap-3">
                <CircleCheckBigIcon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Todas as visitas feitas</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {totalCount} {totalCount === 1 ? "parada" : "paradas"}
                    {lastVisit && ` · última às ${visitedTimeLabel(lastVisit)}`}
                  </p>
                </div>
              </div>
              {route.status !== "CONCLUIDA" && (
                <Button onClick={() => onStatusChange("CONCLUIDA")} className="w-full">
                  <CircleCheckBigIcon />
                  Concluir rota
                </Button>
              )}
            </div>
          ) : route.status === "RASCUNHO" ? (
            <>
              <Button onClick={() => onStatusChange("EM_ANDAMENTO")} className="w-full">
                <PlayIcon />
                Iniciar rota
              </Button>
              {mapsLink}
            </>
          ) : (
            mapsLink
          )}
        </div>
      )}
    </div>
  );
}
