"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { dayKey } from "@/lib/dates";
import type { RouteRecord } from "@/lib/route-service";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDaysIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import { DAY_STATUS_CONFIG, UNDATED } from "./day-labels";

function groupRoutes(routes: RouteRecord[], today: string) {
  const prev: RouteRecord[] = [];
  const todayR: RouteRecord[] = [];
  const next: RouteRecord[] = [];
  const undated: RouteRecord[] = [];
  for (const r of routes) {
    const k = dayKey(r.date);
    if (!k) undated.push(r);
    else if (k < today) prev.push(r);
    else if (k === today) todayR.push(r);
    else next.push(r);
  }
  prev.sort((a, b) => (dayKey(b.date) ?? "").localeCompare(dayKey(a.date) ?? ""));
  next.sort((a, b) => (dayKey(a.date) ?? "").localeCompare(dayKey(b.date) ?? ""));
  return [
    { title: "Anteriores", items: prev },
    { title: "Hoje", items: todayR },
    { title: "Próximas", items: next },
    { title: "Sem data", items: undated },
  ];
}

export function RoutePicker({
  routes,
  activeId,
  today,
  onPick,
}: {
  routes: RouteRecord[];
  activeId: string | null;
  today: string;
  onPick: (day: string, routeId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const sections = groupRoutes(routes, today);
  const empty = sections.every((s) => s.items.length === 0);

  function pick(r: RouteRecord) {
    onPick(dayKey(r.date) ?? UNDATED, r.id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" title="Ver todas as rotas">
          <CalendarDaysIcon className="size-3.5" />
          Rotas
          <ChevronDownIcon className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[70vh] w-72 overflow-y-auto p-1">
        {empty ? (
          <p className="p-3 text-center text-xs text-muted-foreground">Nenhuma rota.</p>
        ) : (
          sections.map((s) =>
            s.items.length === 0 ? null : (
              <div key={s.title} className="flex flex-col">
                <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.title}
                </p>
                {s.items.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => pick(r)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60",
                      r.id === activeId && "bg-muted",
                    )}
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", DAY_STATUS_CONFIG[r.status].className)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.stops.length} parada{r.stops.length !== 1 ? "s" : ""} · {DAY_STATUS_CONFIG[r.status].label}
                      </p>
                    </div>
                    {r.id === activeId && <CheckIcon className="size-3.5 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            ),
          )
        )}
      </PopoverContent>
    </Popover>
  );
}
