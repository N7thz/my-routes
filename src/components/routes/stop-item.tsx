"use client";

import { cn } from "@/lib/utils";
import type { StopRecord } from "@/lib/route-service";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GripVerticalIcon,
  Loader2Icon,
  MapPinOffIcon,
  NavigationIcon,
} from "lucide-react";
import { navUrl, type NavApp } from "@/lib/navigation";
import { usePreferredNavApp } from "@/hooks/use-nav-app";
import { visitedTimeLabel } from "./day-labels";

export function StopItem({
  stop,
  index,
  isLast,
  isCurrent,
  isLoading,
  reordering,
  dragState,
  onToggle,
  onMove,
  onFixAddress,
  dragHandlers,
}: {
  stop: StopRecord;
  index: number;
  isLast: boolean;
  /** Próxima parada da rota em execução (destaque e botões de navegação). */
  isCurrent: boolean;
  isLoading: boolean;
  /** Modo Reordenar: mostra alça e setas no lugar das ações do dia. */
  reordering: boolean;
  /** "dragging": este item está sendo arrastado · "over": vai cair aqui. */
  dragState?: "dragging" | "over";
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onFixAddress: () => void;
  dragHandlers?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const visited = !!stop.visitedAt;
  const [navApp, setNavApp] = usePreferredNavApp();
  const stopName = stop.label ?? stop.company?.name ?? `Parada ${index + 1}`;
  const addressMissing = !!stop.geocodeFailedAt && stop.lat == null;

  return (
    <div
      {...(reordering ? dragHandlers : undefined)}
      className={cn(
        "group relative flex gap-4 px-4 transition-opacity",
        reordering && "cursor-grab active:cursor-grabbing",
        dragState === "dragging" && "opacity-40",
        dragState === "over" &&
          "before:absolute before:inset-x-4 before:-top-px before:h-0.5 before:rounded-full before:bg-foreground",
      )}
    >
      <div className="flex shrink-0 flex-col items-center">
        <button
          type="button"
          onClick={onToggle}
          disabled={isLoading || reordering}
          aria-pressed={visited}
          aria-label={visited ? `${stopName}: visitada. Desmarcar` : `Marcar ${stopName} como visitada`}
          title={visited ? "Desmarcar visita" : "Marcar como visitada"}
          className={cn(
            "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-default",
            visited
              ? "border-emerald-600 bg-emerald-600 text-white enabled:hover:border-emerald-700 enabled:hover:bg-emerald-700"
              : isCurrent
                ? "border-primary bg-primary text-primary-foreground enabled:hover:bg-primary/90"
                : "border-border bg-background text-muted-foreground enabled:hover:border-foreground/60 enabled:hover:text-foreground",
          )}
        >
          {isLoading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : visited ? (
            <CheckIcon className="size-4" strokeWidth={2.5} />
          ) : (
            <span>{index + 1}</span>
          )}
        </button>
        {!isLast && <div className="mt-1 min-h-4 w-0.5 flex-1 bg-border" />}
      </div>

      <div className={cn("min-w-0 flex-1 pt-1", !isLast ? "pb-5" : "pb-2")}>
        {isCurrent && !visited && !reordering && (
          <span className="mb-0.5 inline-block text-xs font-semibold uppercase tracking-wider">Próxima parada</span>
        )}
        <p className={cn("text-sm font-medium leading-snug", visited && "text-muted-foreground line-through")}>
          {stopName}
        </p>
        {stop.company && stop.label && stop.label !== stop.company.name && (
          <p className="text-xs leading-tight text-muted-foreground">{stop.company.name}</p>
        )}
        {!reordering && (
          <>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-foreground/70">{stop.address}</p>
            {addressMissing && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-700 dark:text-amber-400">
                <span className="flex items-center gap-1">
                  <MapPinOffIcon className="size-3.5 shrink-0" />
                  Endereço não encontrado no mapa
                </span>
                <button
                  type="button"
                  onClick={onFixAddress}
                  className="font-medium underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Corrigir endereço
                </button>
              </div>
            )}
            {visited && stop.visitedAt && (
              <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Visitada às {visitedTimeLabel(stop.visitedAt)}
              </p>
            )}
            {isCurrent && !visited && stop.address && (
              <div className="mt-2.5 flex gap-2">
                <NavLink app="google" stop={stop} preferred={navApp === "google"} onPick={setNavApp} />
                <NavLink app="waze" stop={stop} preferred={navApp === "waze"} onPick={setNavApp} />
              </div>
            )}
          </>
        )}
      </div>

      {reordering ? (
        <div className="flex shrink-0 items-center gap-0.5 self-start">
          <span
            aria-hidden
            className="hidden h-10 w-6 items-center justify-center text-muted-foreground pointer-fine:flex"
          >
            <GripVerticalIcon className="size-4" />
          </span>
          <button
            type="button"
            aria-label={`Subir ${stopName} na ordem`}
            title="Subir na ordem"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className={ICON_BUTTON}
          >
            <ChevronUpIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Descer ${stopName} na ordem`}
            title="Descer na ordem"
            onClick={() => onMove(1)}
            disabled={isLast}
            className={ICON_BUTTON}
          >
            <ChevronDownIcon className="size-4" />
          </button>
        </div>
      ) : (
        !isCurrent &&
        !visited &&
        stop.address && (
          <a
            href={navUrl(navApp, stop)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Navegar até ${stopName} pelo ${NAV_LABEL[navApp]}`}
            title={`Navegar pelo ${NAV_LABEL[navApp]}`}
            className={cn(ICON_BUTTON, "shrink-0 self-start")}
          >
            <NavigationIcon className="size-4" />
          </a>
        )
      )}
    </div>
  );
}

const ICON_BUTTON =
  "flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-25";

const NAV_LABEL: Record<NavApp, string> = { google: "Google Maps", waze: "Waze" };

/** Botão de navegação da próxima parada; usar um deles vira a preferência. */
function NavLink({
  app,
  stop,
  preferred,
  onPick,
}: {
  app: NavApp;
  stop: StopRecord;
  preferred: boolean;
  onPick: (app: NavApp) => void;
}) {
  return (
    <a
      href={navUrl(app, stop)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onPick(app)}
      className={cn(
        "inline-flex h-10 min-w-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        preferred
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-[1.5px] border-input hover:bg-accent",
      )}
    >
      <NavigationIcon className="size-4 shrink-0" />
      <span className="truncate">{NAV_LABEL[app]}</span>
    </a>
  );
}
