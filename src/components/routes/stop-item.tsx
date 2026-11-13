"use client";

import { cn } from "@/lib/utils";
import type { StopRecord } from "@/lib/route-service";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, Loader2Icon } from "lucide-react";
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

  return (
    <div className="flex gap-3 px-4">
      <div className="flex shrink-0 flex-col items-center">
        <button
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
          {stop.label ?? stop.company?.name ?? `Parada ${index + 1}`}
        </p>
        {stop.company && stop.label && stop.label !== stop.company.name && (
          <p className="text-xs text-muted-foreground leading-tight">{stop.company.name}</p>
        )}
        <p className="mt-0.5 line-clamp-2 text-xs leading-tight text-muted-foreground">{stop.address}</p>
        {visited && stop.visitedAt && (
          <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Visitada às {visitedTimeLabel(stop.visitedAt)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col justify-center gap-0.5 pt-1">
        <button
          onClick={() => onMove(-1)}
          disabled={index === 0}
          title="Mover para cima"
          className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronUpIcon className="size-4" />
        </button>
        <button
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
