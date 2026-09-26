"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useRoutes, useMarkStopVisited, useUpdateRoute, useReorderStops } from "@/hooks/use-routes";
import {
  useAutoSyncCalendarRoutes,
  SyncCalendarRoutesError,
} from "@/hooks/use-sync-calendar-routes";
import { signIn } from "@/lib/auth-client";
import type { RouteRecord, RouteStatus, StopRecord } from "@/lib/route-service";
import { RouteMap } from "@/components/route-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CheckIcon,
  ExternalLinkIcon,
  Loader2Icon,
  Settings2Icon,
  MapIcon,
  ListIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RouteIcon,
  CalendarDaysIcon,
  CalendarSyncIcon,
} from "lucide-react";
import { RoutesView } from "@/components/routes-view";

// ── Constants ──────────────────────────────────────────────────────────────────

const UNDATED = "__undated__";

const STATUS_CONFIG: Record<RouteStatus, { label: string; className: string }> = {
  RASCUNHO: {
    label: "Rascunho",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-transparent",
  },
  EM_ANDAMENTO: {
    label: "Em andamento",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-transparent",
  },
  CONCLUIDA: {
    label: "Concluída",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent",
  },
};

// ── Date helpers (TZ-safe) ───────────────────────────────────────────────────────
// route.date chega como ISO UTC (date-only à meia-noite). Fatiar os 10 primeiros
// caracteres devolve o dia pretendido sem sofrer conversão de fuso.

function dayKey(date: Date | string | null): string | null {
  if (!date) return null;
  const s = typeof date === "string" ? date : date.toISOString();
  return s.slice(0, 10);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Constrói a data ao meio-dia local a partir da chave, evitando bordas de fuso.
function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

function relativeDayLabel(key: string): string {
  if (key === UNDATED) return "Sem data";
  const today = todayKey();
  if (key === today) return "Hoje";
  const base = dateFromKey(today);
  const yesterday = new Date(base);
  yesterday.setDate(base.getDate() - 1);
  const tomorrow = new Date(base);
  tomorrow.setDate(base.getDate() + 1);
  const d = dateFromKey(key);
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  if (d.toDateString() === tomorrow.toDateString()) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

function fullDayLabel(key: string): string {
  if (key === UNDATED) return "Rotas sem data definida";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateFromKey(key));
}

function visitedTimeLabel(dt: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(dt)
  );
}

function mapsUrl(stops: StopRecord[]): string {
  const addrs = stops.map((s) => encodeURIComponent(s.address));
  return `https://www.google.com/maps/dir/${addrs.join("/")}`;
}

// ── Stop item (timeline) ───────────────────────────────────────────────────────

function StopItem({
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
      {/* timeline column */}
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
              : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground"
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

      {/* content column */}
      <div className={cn("flex-1 min-w-0 pt-1", !isLast ? "pb-4" : "pb-2")}>
        {isCurrent && !visited && (
          <span className="mb-0.5 inline-block text-[10px] font-semibold uppercase tracking-wider text-primary">
            Próxima parada
          </span>
        )}
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            visited && "text-muted-foreground line-through"
          )}
        >
          {stop.label ?? stop.company?.name ?? `Parada ${index + 1}`}
        </p>
        {stop.company && stop.label && stop.label !== stop.company.name && (
          <p className="text-xs text-muted-foreground leading-tight">{stop.company.name}</p>
        )}
        <p className="mt-0.5 line-clamp-2 text-xs leading-tight text-muted-foreground">
          {stop.address}
        </p>
        {visited && stop.visitedAt && (
          <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Visitada às {visitedTimeLabel(stop.visitedAt)}
          </p>
        )}
      </div>

      {/* reorder controls */}
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

// ── Empty states ─────────────────────────────────────────────────────────────────

function EmptyState({
  onManage,
  onSync,
  syncing,
}: {
  onManage: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <RouteIcon className="size-8 text-muted-foreground/60" />
      </div>
      <div>
        <p className="font-semibold">Nenhuma rota criada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Gere as rotas a partir dos eventos da sua agenda ou crie a primeira manualmente.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onSync} disabled={syncing}>
          {syncing ? (
            <Loader2Icon className="mr-1 size-4 animate-spin" />
          ) : (
            <CalendarSyncIcon className="mr-1 size-4" />
          )}
          Buscar na agenda
        </Button>
        <Button variant="outline" onClick={onManage}>
          Criar rota manualmente
        </Button>
      </div>
    </div>
  );
}

function EmptyDay({
  dayLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onManage,
}: {
  dayLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onManage: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <CalendarDaysIcon className="size-8 text-muted-foreground/60" />
      </div>
      <div>
        <p className="font-semibold">Nenhuma rota em {dayLabel.toLowerCase()}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Veja uma rota de outro dia ou crie uma para esta data.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {canPrev && (
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeftIcon className="mr-1 size-4" /> Ver rota anterior
          </Button>
        )}
        {canNext && (
          <Button variant="outline" onClick={onNext}>
            Ver próxima rota <ChevronRightIcon className="ml-1 size-4" />
          </Button>
        )}
        <Button onClick={onManage}>Gerenciar rotas</Button>
      </div>
    </div>
  );
}

// ── Route picker (lista agrupada) ────────────────────────────────────────────────

function RoutePicker({
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

  const sections = useMemo(() => {
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
  }, [routes, today]);

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
                    key={r.id}
                    onClick={() => pick(r)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60",
                      r.id === activeId && "bg-muted"
                    )}
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", STATUS_CONFIG[r.status].className)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.stops.length} parada{r.stops.length !== 1 ? "s" : ""} · {STATUS_CONFIG[r.status].label}
                      </p>
                    </div>
                    {r.id === activeId && <CheckIcon className="size-3.5 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            )
          )
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RoutesDayView({ userImage }: { userImage?: string | null }) {
  const { data: routes = [], isLoading } = useRoutes();
  const markVisited = useMarkStopVisited();
  const updateRoute = useUpdateRoute();
  const reorder = useReorderStops();
  // Roda uma vez ao abrir a página (com throttle) e alimenta o botão manual.
  const syncCalendar = useAutoSyncCalendarRoutes();
  const { resolvedTheme } = useTheme();

  // selectedDay: null = padrão (hoje) · UNDATED = bucket sem data · senão "YYYY-MM-DD"
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [loadingStopId, setLoadingStopId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"stops" | "map">("stops");
  const [manageOpen, setManageOpen] = useState(false);

  // dias distintos que possuem rota (ascendente) + se há rotas sem data
  const routeDays = useMemo(() => {
    const set = new Set<string>();
    for (const r of routes) {
      const k = dayKey(r.date);
      if (k) set.add(k);
    }
    return [...set].sort();
  }, [routes]);
  const hasUndated = useMemo(() => routes.some((r) => !r.date), [routes]);

  const today = todayKey();
  const effectiveDay = selectedDay ?? today;

  const routesOfDay = useMemo(() => {
    const inDay =
      effectiveDay === UNDATED
        ? routes.filter((r) => !r.date)
        : routes.filter((r) => dayKey(r.date) === effectiveDay);
    return inDay.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [routes, effectiveDay]);

  const route = routesOfDay.find((r) => r.id === selectedRouteId) ?? routesOfDay[0] ?? null;

  // navegação entre dias com rota
  const canPrev =
    effectiveDay === UNDATED ? routeDays.length > 0 : routeDays.some((d) => d < effectiveDay);
  const canNext =
    effectiveDay === UNDATED
      ? false
      : routeDays.some((d) => d > effectiveDay) || hasUndated;

  function goToDay(day: string) {
    setSelectedDay(day);
    setSelectedRouteId(null);
  }
  function goPrev() {
    if (effectiveDay === UNDATED) {
      if (routeDays.length) goToDay(routeDays[routeDays.length - 1]);
      return;
    }
    const prev = [...routeDays].reverse().find((d) => d < effectiveDay);
    if (prev) goToDay(prev);
  }
  function goNext() {
    if (effectiveDay === UNDATED) return;
    const next = routeDays.find((d) => d > effectiveDay);
    if (next) goToDay(next);
    else if (hasUndated) goToDay(UNDATED);
  }
  const visitedCount = route?.stops.filter((s) => s.visitedAt).length ?? 0;
  const totalCount = route?.stops.length ?? 0;
  const progress = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;
  const firstUnvisitedIndex = route?.stops.findIndex((s) => !s.visitedAt) ?? -1;

  function handleToggle(stop: StopRecord, routeId: string) {
    setLoadingStopId(stop.id);
    markVisited.mutate(
      { routeId, stopId: stop.id, visited: !stop.visitedAt },
      { onSettled: () => setLoadingStopId(null) }
    );
  }

  function handleStatusChange(status: RouteStatus) {
    if (!route) return;
    updateRoute.mutate({ id: route.id, data: { status } });
  }

  function moveStop(index: number, dir: -1 | 1) {
    if (!route) return;
    const ids = route.stops.map((s) => s.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorder.mutate({ routeId: route.id, orderedIds: ids });
  }

  // Enquanto a primeira sincronização roda, ainda pode aparecer rota — não
  // mostrar "nenhuma rota criada" antes dela responder.
  if (isLoading || (routes.length === 0 && syncCalendar.isPending)) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        <span className="text-sm">
          {routes.length === 0 && syncCalendar.isPending
            ? "Buscando eventos na agenda…"
            : "Carregando rotas…"}
        </span>
      </div>
    );
  }

  // nenhuma rota em todo o sistema
  if (routes.length === 0) {
    return (
      <EmptyState
        onManage={() => setManageOpen(true)}
        onSync={() => syncCalendar.mutate()}
        syncing={syncCalendar.isPending}
      />
    );
  }

  const statusCfg = route ? STATUS_CONFIG[route.status] : null;

  const syncNeedsGoogle =
    syncCalendar.error instanceof SyncCalendarRoutesError &&
    syncCalendar.error.reason !== "unauthenticated";
  const syncTitle = syncNeedsGoogle
    ? "Conecte o Google Agenda para gerar rotas dos eventos"
    : syncCalendar.isError
      ? "Falha ao atualizar pela agenda — clique para tentar de novo"
      : "Atualizar rotas com os eventos da agenda";

  return (
    <div className="flex h-full flex-col">
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Date navigator */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={goPrev}
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
            onClick={goNext}
            disabled={!canNext}
            title="Próximo dia com rota"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          {effectiveDay !== today && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => goToDay(today)}
            >
              Hoje
            </Button>
          )}
          {hasUndated && (
            <Button
              variant={effectiveDay === UNDATED ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => goToDay(UNDATED)}
            >
              Sem data
            </Button>
          )}
        </div>

        {/* Route picker (lista de rotas, com foco nas anteriores) */}
        <RoutePicker
          routes={routes}
          activeId={route?.id ?? null}
          today={today}
          onPick={(day, id) => {
            setSelectedDay(day);
            setSelectedRouteId(id);
          }}
        />

        {/* Route of day + status */}
        {route ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {routesOfDay.length > 1 ? (
              <Select value={route.id} onValueChange={setSelectedRouteId}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  {routesOfDay.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <h1 className="truncate text-sm font-semibold">{route.name}</h1>
            )}

            {statusCfg && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="shrink-0 focus:outline-none">
                    <Badge
                      className={cn(
                        "cursor-pointer gap-1 pr-1.5 text-xs font-medium transition-opacity hover:opacity-80",
                        statusCfg.className
                      )}
                    >
                      {statusCfg.label}
                      <ChevronDownIcon className="size-3" />
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  {(Object.entries(STATUS_CONFIG) as [RouteStatus, typeof STATUS_CONFIG[RouteStatus]][]).map(
                    ([key, cfg]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handleStatusChange(key)}
                        className={cn("gap-2", route.status === key && "font-semibold")}
                      >
                        <Badge className={cn("size-2 rounded-full p-0", cfg.className)} />
                        {cfg.label}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ) : (
          <span className="flex-1 text-sm text-muted-foreground">Nenhuma rota neste dia</span>
        )}

        {/* Progress (sm+) */}
        {route && totalCount > 0 && (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {visitedCount}/{totalCount}
            </span>
          </div>
        )}

        {/* Mobile tab toggle */}
        {route && (
          <div className="flex shrink-0 rounded-md border p-0.5 sm:hidden">
            <button
              onClick={() => setMobileTab("stops")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                mobileTab === "stops"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListIcon className="size-3" /> Paradas
            </button>
            <button
              onClick={() => setMobileTab("map")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                mobileTab === "map"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapIcon className="size-3" /> Mapa
            </button>
          </div>
        )}

        {/* Sync com a agenda */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto shrink-0 size-8 sm:ml-0"
          onClick={() => syncCalendar.mutate()}
          disabled={syncCalendar.isPending}
          title={syncTitle}
        >
          {syncCalendar.isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <CalendarSyncIcon
              className={cn("size-4", syncCalendar.isError && "text-destructive")}
            />
          )}
        </Button>
        {syncNeedsGoogle && (
          <Button
            variant="link"
            size="sm"
            className="h-auto shrink-0 p-0 text-xs"
            onClick={() => signIn.social({ provider: "google", callbackURL: "/rotas" })}
          >
            Conectar agenda
          </Button>
        )}

        {/* Manage sheet */}
        <Sheet open={manageOpen} onOpenChange={setManageOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 size-8" title="Gerenciar rotas">
              <Settings2Icon className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-2xl p-0 sm:max-w-2xl">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>Gerenciar rotas</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100vh-73px)] p-6">
              <RoutesView />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      {!route ? (
        <div className="flex-1 min-h-0">
          <EmptyDay
            dayLabel={relativeDayLabel(effectiveDay)}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={goPrev}
            onNext={goNext}
            onManage={() => setManageOpen(true)}
          />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Left panel — stops timeline */}
          <div
            className={cn(
              "flex w-80 shrink-0 flex-col border-r",
              "sm:flex",
              mobileTab === "stops" ? "flex" : "hidden"
            )}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Paradas
              </span>
              <span className="text-xs text-muted-foreground">
                {visitedCount} de {totalCount} visitadas
              </span>
            </div>

            {/* Timeline list */}
            <div className="flex-1 overflow-y-auto py-3">
              {route.stops.length === 0 ? (
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
                    isLast={i === route.stops.length - 1}
                    isCurrent={i === firstUnvisitedIndex}
                    isLoading={loadingStopId === stop.id}
                    onToggle={() => handleToggle(stop, route.id)}
                    onMove={(dir) => moveStop(i, dir)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {route.stops.length > 0 && (
              <div className="shrink-0 border-t px-4 py-3">
                {/* Mobile progress */}
                <div className="mb-3 flex items-center gap-2 sm:hidden">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
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

          {/* Right panel — map */}
          <div
            className={cn(
              "flex-1 min-w-0",
              mobileTab === "map" ? "flex" : "hidden sm:block"
            )}
          >
            <RouteMap stops={route.stops} dark={resolvedTheme === "dark"} userImage={userImage} />
          </div>
        </div>
      )}
    </div>
  );
}
