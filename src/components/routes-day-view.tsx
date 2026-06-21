"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useRoutes, useMarkStopVisited, useUpdateRoute } from "@/hooks/use-routes";
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
import {
  CheckIcon,
  ExternalLinkIcon,
  Loader2Icon,
  Settings2Icon,
  MapIcon,
  ListIcon,
  ChevronDownIcon,
  RouteIcon,
  CalendarDaysIcon,
} from "lucide-react";
import { RoutesView } from "@/components/routes-view";

// ── Constants ──────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function dateLabel(date: Date | string | null): string {
  if (!date) return "Sem data";
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hoje";
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

function dateLong(date: Date | string | null): string {
  if (!date) return "Sem data definida";
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(d) + " (hoje)";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
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

function isToday(date: Date | string | null): boolean {
  if (!date) return false;
  return new Date(date).toDateString() === new Date().toDateString();
}

function findPrimaryRoute(routes: RouteRecord[]): RouteRecord | null {
  if (!routes.length) return null;
  const today = new Date().toDateString();
  return (
    routes.find((r) => r.date && new Date(r.date).toDateString() === today) ??
    routes.find((r) => r.date && new Date(r.date) > new Date()) ??
    routes[0]
  );
}

// ── Stop item (timeline) ───────────────────────────────────────────────────────

function StopItem({
  stop,
  index,
  isLast,
  isCurrent,
  isLoading,
  onToggle,
}: {
  stop: StopRecord;
  index: number;
  isLast: boolean;
  isCurrent: boolean;
  isLoading: boolean;
  onToggle: () => void;
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
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ onManage }: { onManage: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <RouteIcon className="size-8 text-muted-foreground/60" />
      </div>
      <div>
        <p className="font-semibold">Nenhuma rota criada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie sua primeira rota para começar a planejar visitas.
        </p>
      </div>
      <Button onClick={onManage} className="mt-2">
        Criar primeira rota
      </Button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RoutesDayView({ userImage }: { userImage?: string | null }) {
  const { data: routes = [], isLoading } = useRoutes();
  const markVisited = useMarkStopVisited();
  const updateRoute = useUpdateRoute();
  const { resolvedTheme } = useTheme();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingStopId, setLoadingStopId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"stops" | "map">("stops");
  const [manageOpen, setManageOpen] = useState(false);

  const primaryRoute = useMemo(() => findPrimaryRoute(routes), [routes]);
  const activeId = selectedId ?? primaryRoute?.id ?? null;
  const route = routes.find((r) => r.id === activeId) ?? null;

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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        <span className="text-sm">Carregando rotas…</span>
      </div>
    );
  }

  if (!route) {
    return (
      <EmptyState
        onManage={() => setManageOpen(true)}
      />
    );
  }

  const statusCfg = STATUS_CONFIG[route.status];

  return (
    <div className="flex h-full flex-col">
      {/* ── Route header bar ─────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Route info */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="truncate text-sm font-semibold">{route.name}</h1>
            {isToday(route.date) && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Hoje
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDaysIcon className="size-3 shrink-0" />
            <span className="truncate">{dateLong(route.date)}</span>
          </div>
        </div>

        {/* Status dropdown */}
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
          <DropdownMenuContent align="end" className="w-40">
            {(Object.entries(STATUS_CONFIG) as [RouteStatus, typeof statusCfg][]).map(
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

        {/* Progress */}
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

        {/* Route switcher */}
        {routes.length > 1 && (
          <Select value={activeId ?? ""} onValueChange={(v) => setSelectedId(v)}>
            <SelectTrigger className="hidden h-8 w-44 text-xs sm:flex">
              <SelectValue placeholder="Selecionar rota" />
            </SelectTrigger>
            <SelectContent align="end">
              {routes.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs">
                  <span className="font-medium">{r.name}</span>
                  <span className="ml-1.5 text-muted-foreground">{dateLabel(r.date)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Mobile tab toggle */}
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
            <div className="overflow-y-auto h-[calc(100vh-73px)]">
              <RoutesView />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
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
                <p className="text-xs">Use "Gerenciar rotas" para adicionar paradas.</p>
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
    </div>
  );
}
