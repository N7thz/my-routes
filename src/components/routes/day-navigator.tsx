"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { fullDayLabel, relativeDayLabel, UNDATED } from "./day-labels";

/** Setas de dia anterior/próximo, rótulo do dia e atalhos "Hoje" / "Sem data". */
export function DayNavigator({
  effectiveDay,
  today,
  canPrev,
  canNext,
  hasUndated,
  onPrev,
  onNext,
  onGoTo,
}: {
  effectiveDay: string;
  today: string;
  canPrev: boolean;
  canNext: boolean;
  hasUndated: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (day: string) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onPrev}
        disabled={!canPrev}
        title="Dia anterior com rota"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <div className="min-w-[7.5rem] px-1 text-center leading-tight">
        <div className="text-sm font-semibold">{relativeDayLabel(effectiveDay)}</div>
        <div className="text-[11px] text-muted-foreground">{fullDayLabel(effectiveDay)}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onNext}
        disabled={!canNext}
        title="Próximo dia com rota"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
      {effectiveDay !== today && (
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onGoTo(today)}>
          Hoje
        </Button>
      )}
      {hasUndated && (
        <Button
          variant={effectiveDay === UNDATED ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => onGoTo(UNDATED)}
        >
          Sem data
        </Button>
      )}
    </div>
  );
}
