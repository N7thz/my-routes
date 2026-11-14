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
    <nav aria-label="Dia" className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Dia anterior com rota"
        title="Dia anterior com rota"
      >
        <ChevronLeftIcon />
      </Button>
      <div className="min-w-[7.5rem] px-1 text-center leading-tight" aria-live="polite">
        <div className="text-sm font-semibold">{relativeDayLabel(effectiveDay)}</div>
        <div className="text-xs text-muted-foreground">{fullDayLabel(effectiveDay)}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Próximo dia com rota"
        title="Próximo dia com rota"
      >
        <ChevronRightIcon />
      </Button>
      {effectiveDay !== today && (
        <Button variant="outline" size="sm" className="ml-1" onClick={() => onGoTo(today)}>
          Hoje
        </Button>
      )}
      {hasUndated && (
        <Button variant={effectiveDay === UNDATED ? "secondary" : "ghost"} size="sm" onClick={() => onGoTo(UNDATED)}>
          Sem data
        </Button>
      )}
    </nav>
  );
}
