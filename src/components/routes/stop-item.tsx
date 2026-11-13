"use client";

import { cn } from "@/lib/utils";
import type { StopRecord } from "@/lib/route-service";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, Loader2Icon, MapPinOffIcon, NavigationIcon } from "lucide-react";
import { navUrl, type NavApp } from "@/lib/navigation";
import { usePreferredNavApp } from "@/hooks/use-nav-app";
import { visitedTimeLabel } from "./day-labels";

export function StopItem({
  stop,
  index,
  isLast,
  isCurrent,
  isLoading,
  onToggle,
  onMove,
}: {
  stop: StopRecord;
  index: number;
  isLast: boolean;
  isCurrent: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const visited = !!stop.visitedAt;
  const [navApp, setNavApp] = usePreferredNavApp();
  const stopName = stop.label ?? stop.company?.name ?? `Parada ${index + 1}`;

  return (
    <div className="flex gap-3 px-4">
      <div className="flex shrink-0 flex-col items-center">
        <button
          type="button"
          onClick={onToggle}
          disabled={isLoading}
          title={visited ? "Marcar como não visitada" : "Marcar como visitada"}
          className={cn(
            "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            visited
              ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600"
              : isCurrent
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
          )}
        >
          {isLoading ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : visited ? (
            <CheckIcon className="size-4" strokeWidth={2.5} />
          ) : (
            <span>{index + 1}</span>
          )}
        </button>
        {!isLast && <div className="mt-1 w-0.5 flex-1 min-h-4 bg-border" />}
      </div>

      <div className={cn("flex-1 min-w-0 pt-1", !isLast ? "pb-4" : "pb-2")}>
        {isCurrent && !visited && (
          <span className="mb-0.5 inline-block text-[10px] font-semibold uppercase tracking-wider text-primary">
            Próxima parada
          </span>
        )}
        <p className={cn("text-sm font-medium leading-snug", visited && "text-muted-foreground line-through")}>
          {stopName}
        </p>
        {stop.company && stop.label && stop.label !== stop.company.name && (
          <p className="text-xs text-muted-foreground leading-tight">{stop.company.name}</p>
        )}
        <p className="mt-0.5 line-clamp-2 text-xs leading-tight text-muted-foreground">{stop.address}</p>
        {stop.geocodeFailedAt && stop.lat == null && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <MapPinOffIcon className="size-3 shrink-0" />
            Endereço não localizado no mapa
          </p>
        )}
        {visited && stop.visitedAt && (
          <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Visitada às {visitedTimeLabel(stop.visitedAt)}
          </p>
        )}
        {isCurrent && !visited && stop.address && (
          <div className="mt-2 flex gap-2">
            <NavLink app="google" stop={stop} preferred={navApp === "google"} onPick={setNavApp} />
            <NavLink app="waze" stop={stop} preferred={navApp === "waze"} onPick={setNavApp} />
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col justify-center gap-0.5 pt-1">
        {!isCurrent && !visited && stop.address && (
          <a
            href={navUrl(navApp, stop)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Navegar até ${stopName} pelo ${NAV_LABEL[navApp]}`}
            title={`Navegar pelo ${NAV_LABEL[navApp]}`}
            className="mb-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <NavigationIcon className="size-4" />
          </a>
        )}
        <button
          type="button"
          aria-label="Mover para cima"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          title="Mover para cima"
          className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronUpIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Mover para baixo"
          onClick={() => onMove(1)}
          disabled={isLast}
          title="Mover para baixo"
          className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronDownIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

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
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        preferred
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "hover:bg-muted",
      )}
    >
      <NavigationIcon className="size-3.5" />
      {NAV_LABEL[app]}
    </a>
  );
}
