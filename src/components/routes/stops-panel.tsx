"use client";

import { cn } from "@/lib/utils";
import type { RouteRecord } from "@/lib/route-service";
import { ExternalLinkIcon } from "lucide-react";
import { mapsUrl } from "./day-labels";
import { StopItem } from "./stop-item";

export function ProgressBar({ progress, className }: { progress: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/** Coluna lateral com a linha do tempo de paradas da rota. */
export function StopsPanel({
  route,
  visibleOnMobile,
  loadingStopId,
  onToggle,
  onMove,
}: {
  route: RouteRecord;
  visibleOnMobile: boolean;
  loadingStopId: string | null;
  onToggle: (stopId: string, visited: boolean) => void;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const totalCount = route.stops.length;
  const visitedCount = route.stops.filter((s) => s.visitedAt).length;
  const progress = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;
  const firstUnvisitedIndex = route.stops.findIndex((s) => !s.visitedAt);

  return (
    <div className={cn("flex w-80 shrink-0 flex-col border-r", "sm:flex", visibleOnMobile ? "flex" : "hidden")}>
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paradas</span>
        <span className="text-xs text-muted-foreground">
          {visitedCount} de {totalCount} visitadas
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
            <p>Nenhuma parada adicionada.</p>
            <p className="text-xs">Use &quot;Gerenciar rotas&quot; para adicionar paradas.</p>
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
              onToggle={() => onToggle(stop.id, !stop.visitedAt)}
              onMove={(dir) => onMove(i, dir)}
            />
          ))
        )}
      </div>

      {totalCount > 0 && (
        <div className="shrink-0 border-t px-4 py-3">
          <div className="mb-3 flex items-center gap-2 sm:hidden">
            <ProgressBar progress={progress} className="h-1.5 flex-1" />
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {visitedCount}/{totalCount}
            </span>
          </div>

          <a
            href={mapsUrl(route.stops)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
          >
            <ExternalLinkIcon className="size-3" />
            Abrir rota no Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
