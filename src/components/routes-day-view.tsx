"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useRoutes, useRouteDays, useMarkStopVisited, useUpdateRoute, useReorderStops } from "@/hooks/use-routes";
import { useAutoSyncCalendarRoutes } from "@/hooks/use-sync-calendar-routes";
import { useRunAutoRoute } from "@/hooks/use-auto-route";
import { ApiError } from "@/lib/api-client";
import { dayKey, defaultRoutesFrom, shiftDayKey, todayKey } from "@/lib/dates";
import { signIn } from "@/lib/auth-client";
import type { RouteStatus } from "@/lib/route-service";
import { RouteMap } from "@/components/route-map";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CalendarSyncIcon, ListIcon, Loader2Icon, MapIcon, Settings2Icon, SparklesIcon } from "lucide-react";
import { RoutesView } from "@/components/routes-view";
import { UNDATED, relativeDayLabel } from "@/components/routes/day-labels";
import { DayNavigator } from "@/components/routes/day-navigator";
import { EmptyDay, EmptyState } from "@/components/routes/day-empty-states";
import { RoutePicker } from "@/components/routes/route-picker";
import { RouteTitle } from "@/components/routes/route-title";
import { ProgressBar, StopsPanel } from "@/components/routes/stops-panel";

export function RoutesDayView({ userImage }: { userImage?: string | null }) {
  const { data: days = [], isLoading: daysLoading } = useRouteDays();
  const markVisited = useMarkStopVisited();
  const updateRoute = useUpdateRoute();
  const reorder = useReorderStops();
  // Roda uma vez ao abrir a página (com throttle) e alimenta o botão manual.
  const syncCalendar = useAutoSyncCalendarRoutes();
  // "Gerar agora": Runrunit + agenda + ordem otimizada, sem esperar o cron.
  const autoRoute = useRunAutoRoute();
  const { resolvedTheme } = useTheme();

  // selectedDay: null = padrão (hoje) · UNDATED = bucket sem data · senão "YYYY-MM-DD"
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [loadingStopId, setLoadingStopId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"stops" | "map">("stops");
  const [manageOpen, setManageOpen] = useState(false);

  // A navegação usa a lista leve de dias (todo o histórico); as rotas em si só
  // vêm da janela em volta do dia aberto.
  const routeDays = days.flatMap((d) => (d.day ? [d.day] : []));
  const hasUndated = days.some((d) => !d.day);

  const today = todayKey();
  const effectiveDay = selectedDay ?? today;
  const isOldDay = effectiveDay !== UNDATED && effectiveDay < defaultRoutesFrom();
  const { data: routes = [], isLoading: routesLoading } = useRoutes(
    isOldDay ? { from: shiftDayKey(effectiveDay, -30), to: shiftDayKey(effectiveDay, 30) } : undefined,
  );
  const isLoading = daysLoading || routesLoading;
  const hasAnyRoute = days.length > 0;

  const routesOfDay = routes
    .filter((r) => (effectiveDay === UNDATED ? !r.date : dayKey(r.date) === effectiveDay))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const route = routesOfDay.find((r) => r.id === selectedRouteId) ?? routesOfDay[0] ?? null;

  const canPrev = effectiveDay === UNDATED ? routeDays.length > 0 : routeDays.some((d) => d < effectiveDay);
  const canNext = effectiveDay === UNDATED ? false : routeDays.some((d) => d > effectiveDay) || hasUndated;

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

  function handleToggle(stopId: string, visited: boolean) {
    if (!route) return;
    setLoadingStopId(stopId);
    markVisited.mutate({ routeId: route.id, stopId, visited }, { onSettled: () => setLoadingStopId(null) });
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
  if (isLoading || (!hasAnyRoute && syncCalendar.isPending)) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        <span className="text-sm">
          {!hasAnyRoute && syncCalendar.isPending ? "Buscando eventos na agenda…" : "Carregando rotas…"}
        </span>
      </div>
    );
  }

  if (!hasAnyRoute) {
    return (
      <EmptyState
        onManage={() => setManageOpen(true)}
        onSync={() => syncCalendar.mutate()}
        syncing={syncCalendar.isPending}
      />
    );
  }

  const syncNeedsGoogle =
    syncCalendar.error instanceof ApiError &&
    !!syncCalendar.error.reason &&
    syncCalendar.error.reason !== "unauthenticated";
  const syncTitle = syncNeedsGoogle
    ? "Conecte o Google Agenda para gerar rotas dos eventos"
    : syncCalendar.isError
      ? "Falha ao atualizar pela agenda — clique para tentar de novo"
      : "Atualizar rotas com os eventos da agenda";

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <DayNavigator
          effectiveDay={effectiveDay}
          today={today}
          canPrev={canPrev}
          canNext={canNext}
          hasUndated={hasUndated}
          onPrev={goPrev}
          onNext={goNext}
          onGoTo={goToDay}
        />

        <RoutePicker
          routes={routes}
          activeId={route?.id ?? null}
          today={today}
          onPick={(day, id) => {
            setSelectedDay(day);
            setSelectedRouteId(id);
          }}
        />

        {route ? (
          <RouteTitle
            route={route}
            routesOfDay={routesOfDay}
            onSelectRoute={setSelectedRouteId}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <span className="flex-1 text-sm text-muted-foreground">Nenhuma rota neste dia</span>
        )}

        {route && totalCount > 0 && (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <ProgressBar progress={progress} className="h-1.5 w-20" />
            <span className="text-xs tabular-nums text-muted-foreground">
              {visitedCount}/{totalCount}
            </span>
          </div>
        )}

        {route && (
          <div className="flex shrink-0 rounded-md border p-0.5 sm:hidden">
            <button
              type="button"
              onClick={() => setMobileTab("stops")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                mobileTab === "stops"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ListIcon className="size-3" /> Paradas
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("map")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                mobileTab === "map"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MapIcon className="size-3" /> Mapa
            </button>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto shrink-0 size-8 sm:ml-0"
          onClick={() => autoRoute.mutate()}
          disabled={autoRoute.isPending}
          aria-label="Gerar rotas automáticas agora"
          title={
            autoRoute.isSuccess
              ? autoRoute.data.summary
              : autoRoute.isError
                ? autoRoute.error.message
                : "Gerar rotas automáticas agora (Runrunit + agenda, na melhor ordem)"
          }
        >
          {autoRoute.isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SparklesIcon className={cn("size-4", autoRoute.isError && "text-destructive")} />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 size-8"
          onClick={() => syncCalendar.mutate()}
          disabled={syncCalendar.isPending}
          title={syncTitle}
        >
          {syncCalendar.isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <CalendarSyncIcon className={cn("size-4", syncCalendar.isError && "text-destructive")} />
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
          <StopsPanel
            route={route}
            visibleOnMobile={mobileTab === "stops"}
            loadingStopId={loadingStopId}
            onToggle={handleToggle}
            onMove={moveStop}
          />

          <div className={cn("flex-1 min-w-0", mobileTab === "map" ? "flex" : "hidden sm:block")}>
            <RouteMap stops={route.stops} dark={resolvedTheme === "dark"} userImage={userImage} />
          </div>
        </div>
      )}
    </div>
  );
}
