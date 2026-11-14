"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { dayKey } from "@/lib/dates";
import type { RouteRecord } from "@/lib/route-service";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDaysIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import { UNDATED } from "./day-labels";
import { STATUS_CONFIG } from "./list-status-config";

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
        <Button variant="outline" size="sm" className="shrink-0 max-sm:size-10 max-sm:px-0">
          <CalendarDaysIcon />
          <span className="max-sm:sr-only">Todas as rotas</span>
          <ChevronDownIcon className="opacity-60 max-sm:hidden" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[70vh] w-72 overflow-y-auto p-1">
        {empty ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma rota ainda.</p>
        ) : (
          sections.map((s) =>
            s.items.length === 0 ? null : (
              <div key={s.title} className="flex flex-col">
                <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.title}
                </p>
                {s.items.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => pick(r)}
                    aria-current={r.id === activeId ? "true" : undefined}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent",
                      r.id === activeId && "bg-accent",
                    )}
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", STATUS_CONFIG[r.status].dotClassName)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{r.name}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {r.stops.length} parada{r.stops.length !== 1 ? "s" : ""} · {STATUS_CONFIG[r.status].label}
                      </p>
                    </div>
                    {r.id === activeId && <CheckIcon className="size-4 shrink-0" />}
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
