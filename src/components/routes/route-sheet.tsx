"use client";

import { useState } from "react";
import { googleMapsRouteUrl } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { useRemoveStop, useMarkStopVisited, useReorderStops } from "@/hooks/use-routes";
import type { RouteRecord, StopRecord } from "@/lib/route-service";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { SheetTitle } from "@/components/ui/sheet";
import {
  BuildingIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleIcon,
  MapPinIcon,
  NavigationIcon,
  PencilIcon,
  PlusIcon,
  RouteIcon,
  Trash2Icon,
} from "lucide-react";
import { AddStopDialog } from "./add-stop-dialog";
import { QuickRouteStatus } from "./quick-route-status";

export function StopRow({
  stop,
  routeId,
  index,
  total,
  onMove,
}: {
  stop: StopRecord;
  routeId: string;
  index: number;
  total: number;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const remove = useRemoveStop();
  const markVisited = useMarkStopVisited();
  const visited = !!stop.visitedAt;

  return (
    <div className={cn("flex items-start gap-2 py-3 px-1 rounded-md transition-colors group", visited && "opacity-60")}>
      <div className="-my-0.5 flex shrink-0 flex-col">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          title="Mover para cima"
          className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronUpIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          title="Mover para baixo"
          className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronDownIcon className="size-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => markVisited.mutate({ routeId, stopId: stop.id, visited: !visited })}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        title={visited ? "Marcar como não visitada" : "Marcar como visitada"}
      >
        {visited ? <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-500" /> : <CircleIcon className="size-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-snug", visited && "line-through")}>
          {stop.label ?? stop.company?.name ?? "Parada"}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPinIcon className="size-3 shrink-0" />
          <span className="truncate">{stop.address}</span>
        </p>
        {stop.company && stop.label && stop.label !== stop.company.name && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <BuildingIcon className="size-3 shrink-0" />
            {stop.company.name}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => remove.mutate({ routeId, stopId: stop.id })}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        title="Remover parada"
      >
        <Trash2Icon className="size-3.5" />
      </button>
    </div>
  );
}

export function RouteSheet({
  route,
  onClose,
  onEdit,
  onDelete,
}: {
  route: RouteRecord | null;
  onClose: () => void;
  onEdit: (r: RouteRecord) => void;
  onDelete: (r: RouteRecord) => void;
}) {
  const [addingStop, setAddingStop] = useState(false);
  const reorder = useReorderStops();
  if (!route) return null;

  function moveStop(index: number, dir: -1 | 1) {
    if (!route) return;
    const ids = route.stops.map((s) => s.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorder.mutate({ routeId: route.id, orderedIds: ids });
  }

  const visited = route.stops.filter((s) => s.visitedAt).length;

  return (
    <>
      {route && <AddStopDialog routeId={route.id} open={addingStop} onClose={() => setAddingStop(false)} />}
      <Sheet open={!!route} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="flex flex-col gap-0 overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <RouteIcon className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Rota</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(route)} title="Editar">
                  <PencilIcon className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(route)}
                  title="Excluir"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            </div>
            <SheetTitle className="text-lg">{route.name}</SheetTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <QuickRouteStatus route={route} />
              {route.date && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="size-3" />
                  {formatDate(route.date)}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {visited}/{route.stops.length} paradas visitadas
              </span>
            </div>
          </SheetHeader>

          <Separator />

          <div className="py-3 flex-1">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-xs font-medium">Paradas ({route.stops.length})</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddingStop(true)}>
                <PlusIcon className="size-3 mr-1" /> Adicionar
              </Button>
            </div>

            {route.stops.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <MapPinIcon className="size-8" />
                <p className="text-sm">Nenhuma parada ainda.</p>
                <Button size="sm" variant="outline" onClick={() => setAddingStop(true)}>
                  <PlusIcon className="size-4 mr-1.5" /> Adicionar parada
                </Button>
              </div>
            ) : (
              <div className="flex flex-col divide-y">
                {route.stops.map((stop, i) => (
                  <StopRow
                    key={stop.id}
                    stop={stop}
                    routeId={route.id}
                    index={i}
                    total={route.stops.length}
                    onMove={moveStop}
                  />
                ))}
              </div>
            )}
          </div>

          {route.stops.length > 0 && (
            <>
              <Separator />
              <div className="py-3 px-1">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    // Só o que falta visitar (ou tudo, se já terminou), saindo da posição atual.
                    const pending = route.stops.filter((s) => !s.visitedAt && s.address);
                    const url = googleMapsRouteUrl(pending.length > 0 ? pending : route.stops);
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <NavigationIcon className="size-4" />
                  Abrir no Google Maps
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
