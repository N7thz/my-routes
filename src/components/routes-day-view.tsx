"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useRoutes, useRouteDays, useMarkStopVisited, useUpdateRoute, useReorderStops } from "@/hooks/use-routes";
import { useAutoSyncCalendarRoutes } from "@/hooks/use-sync-calendar-routes";
import { useUnmatchedEvents } from "@/hooks/use-unmatched-events";
import { useAutoCheckinSetting, useRouteTrack, useRouteTracking } from "@/hooks/use-route-tracking";
import { useRunAutoRoute } from "@/hooks/use-auto-route";
import { ApiError } from "@/lib/api-client";
import { dayKey, defaultRoutesFrom, shiftDayKey, todayKey } from "@/lib/dates";
import { signIn } from "@/lib/auth-client";
import type { RouteStatus } from "@/lib/route-service";
import { RouteMap } from "@/components/route-map";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  BuildingIcon,
  CalendarSyncIcon,
  EllipsisIcon,
  ListIcon,
  LocateFixedIcon,
  LocateOffIcon,
  Loader2Icon,
  MapIcon,
  Settings2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { RoutesView } from "@/components/routes-view";
import { UNDATED, relativeDayLabel, visitedTimeLabel } from "@/components/routes/day-labels";
import { DayNavigator } from "@/components/routes/day-navigator";
import { EmptyDay, EmptyState } from "@/components/routes/day-empty-states";
import { RoutePicker } from "@/components/routes/route-picker";
import { RouteTitle } from "@/components/routes/route-title";
import { StopsPanel } from "@/components/routes/stops-panel";
import { UnmatchedEventsSheet } from "@/components/routes/unmatched-events-sheet";

export function RoutesDayView({ userImage }: { userImage?: string | null }) {
  const { data: days = [], isLoading: daysLoading } = useRouteDays();
  const markVisited = useMarkStopVisited();
  const updateRoute = useUpdateRoute();
  const reorder = useReorderStops();
  // Roda uma vez ao abrir a página (com throttle) e alimenta o botão manual.
  const syncCalendar = useAutoSyncCalendarRoutes();
  // "Gerar agora": empresas agendadas + agenda + ordem otimizada, sem esperar o cron.
  const autoRoute = useRunAutoRoute();
  const { resolvedTheme } = useTheme();

  // selectedDay: null = padrão (hoje) · UNDATED = bucket sem data · senão "YYYY-MM-DD"
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [loadingStopId, setLoadingStopId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"stops" | "map">("stops");
  const [manageOpen, setManageOpen] = useState(false);
  // Eventos da agenda que não citam nenhuma empresa: candidatos a cadastro.
  const { data: unmatched = [] } = useUnmatchedEvents();
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);
  // Ordem anterior à última reordenação, para o "Desfazer".
  const [undoVisit, setUndoVisit] = useState<{
    routeId: string;
    stopId: string;
    name: string;
    visited: boolean;
    at: Date;
    /** Marcada pelo check-in automático (GPS), não por toque. */
    auto?: boolean;
  } | null>(null);
  const [undoReorder, setUndoReorder] = useState<{ routeId: string; orderedIds: string[] } | null>(null);

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
  // Hoje (ou dia passado) é execução; dia futuro ou sem data é planejamento.
  const mode: "run" | "plan" = effectiveDay !== UNDATED && effectiveDay <= today ? "run" : "plan";

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

  function handleToggle(stopId: string, visited: boolean, { remember = true, auto = false } = {}) {
    if (!route) return;
    setLoadingStopId(stopId);
    markVisited.mutate({ routeId: route.id, stopId, visited }, { onSettled: () => setLoadingStopId(null) });
    // Toque errado com o dedo na rua (ou chegada detectada por engano): o aviso
    // abaixo da barra oferece desfazer.
    if (remember) {
      const stop = route.stops.find((s) => s.id === stopId);
      const name = stop?.label ?? stop?.company?.name ?? "Parada";
      setUndoVisit({ routeId: route.id, stopId, name, visited, at: new Date(), auto });
      setUndoReorder(null);
    }
    // Primeira visita do dia tira a rota do rascunho sozinha (automático antes de manual).
    if (visited && route.status === "RASCUNHO" && mode === "run") {
      updateRoute.mutate({ id: route.id, data: { status: "EM_ANDAMENTO" } });
    }
  }

  // GPS na rota de hoje: grava o trajeto e marca a parada como visitada ao
  // ficar um minuto nela. Liga/desliga por aparelho, no menu de ações.
  const [autoCheckin, setAutoCheckin] = useAutoCheckinSetting();
  const tracking = autoCheckin && !!route && effectiveDay === today && route.status !== "CONCLUIDA";
  useRouteTracking({
    routeId: tracking ? route.id : null,
    stops: route?.stops ?? [],
    onArrive: (stopId) => handleToggle(stopId, true, { auto: true }),
  });
  const { data: trail } = useRouteTrack(route && mode === "run" ? route.id : null);

  function handleStatusChange(status: RouteStatus) {
    if (!route) return;
    updateRoute.mutate({ id: route.id, data: { status } });
  }

  function reorderStops(from: number, to: number) {
    if (!route || from === to || to < 0 || to >= route.stops.length) return;
    const before = route.stops.map((s) => s.id);
    const ids = [...before];
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    reorder.mutate({ routeId: route.id, orderedIds: ids });
    setUndoReorder({ routeId: route.id, orderedIds: before });
    setUndoVisit(null);
  }

  function moveStop(index: number, dir: -1 | 1) {
    reorderStops(index, index + dir);
  }

  // Ficam fora dos ramos para abrir também a partir do estado vazio.
  const manageSheet = (
    <>
      <Sheet open={manageOpen} onOpenChange={setManageOpen}>
        <SheetContent side="right" className="w-full max-w-2xl p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>Gerenciar rotas</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100dvh-73px)] overflow-y-auto p-6">
            <RoutesView />
          </div>
        </SheetContent>
      </Sheet>
      <UnmatchedEventsSheet
        open={unmatchedOpen}
        onOpenChange={setUnmatchedOpen}
        events={unmatched}
        onChanged={() => syncCalendar.mutate()}
      />
    </>
  );

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
      <>
        <EmptyState
          onGenerate={() => autoRoute.mutate()}
          generating={autoRoute.isPending}
          onManage={() => setManageOpen(true)}
          onSync={() => syncCalendar.mutate()}
          syncing={syncCalendar.isPending}
        />
        {manageSheet}
      </>
    );
  }

  const syncNeedsGoogle =
    syncCalendar.error instanceof ApiError &&
    !!syncCalendar.error.reason &&
    syncCalendar.error.reason !== "unauthenticated";
  const syncFailed = syncCalendar.isError && !syncNeedsGoogle;
  const actionsBusy = autoRoute.isPending || syncCalendar.isPending;
  const actionsFailed = autoRoute.isError || syncFailed;

  // Resultado da última ação, numa linha abaixo da barra (antes ficava só no tooltip).
  type Notice = {
    tone: "ok" | "error";
    text: string;
    dismiss: () => void;
    action?: { label: string; run: () => void };
  };
  const notice: Notice | null = autoRoute.isError
    ? {
        tone: "error",
        text: `Não deu para gerar a rota: ${autoRoute.error.message}`,
        dismiss: () => autoRoute.reset(),
        action: { label: "Tentar de novo", run: () => autoRoute.mutate() },
      }
    : syncFailed
      ? {
          tone: "error",
          text: "Não deu para atualizar as rotas pela agenda. Confira a conexão e tente de novo.",
          dismiss: () => syncCalendar.reset(),
          action: { label: "Tentar de novo", run: () => syncCalendar.mutate() },
        }
      : markVisited.isError
        ? {
            tone: "error",
            text: "A visita não foi salva. A parada voltou ao estado anterior.",
            dismiss: () => markVisited.reset(),
          }
        : reorder.isError
          ? {
              tone: "error",
              text: "A nova ordem não foi salva. As paradas voltaram para a ordem anterior.",
              dismiss: () => reorder.reset(),
            }
          : undoVisit && undoVisit.routeId === route?.id
            ? {
                tone: "ok",
                text: undoVisit.visited
                  ? `${undoVisit.auto ? "Chegada detectada: " : ""}${undoVisit.name} marcada como visitada às ${visitedTimeLabel(undoVisit.at)}.`
                  : `${undoVisit.name} desmarcada.`,
                dismiss: () => setUndoVisit(null),
                action: {
                  label: "Desfazer",
                  run: () => {
                    handleToggle(undoVisit.stopId, !undoVisit.visited, { remember: false });
                    setUndoVisit(null);
                  },
                },
              }
            : undoReorder && undoReorder.routeId === route?.id
              ? {
                  tone: "ok",
                  text: "Ordem das paradas alterada.",
                  dismiss: () => setUndoReorder(null),
                  action: {
                    label: "Desfazer",
                    run: () => {
                      reorder.mutate(undoReorder);
                      setUndoReorder(null);
                    },
                  },
                }
              : autoRoute.isSuccess
                ? { tone: "ok", text: autoRoute.data.summary, dismiss: () => autoRoute.reset() }
                : null;

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4">
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

          {/* No celular a rota desce para a própria linha; no desktop ocupa o meio. */}
          <div className="order-last flex min-w-0 basis-full items-center sm:order-none sm:flex-1 sm:basis-0">
            {route ? (
              <RouteTitle
                route={route}
                routesOfDay={routesOfDay}
                onSelectRoute={setSelectedRouteId}
                onStatusChange={handleStatusChange}
              />
            ) : (
              <span className="text-sm text-muted-foreground">Nenhuma rota neste dia</span>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0 sm:gap-2">
            {syncNeedsGoogle && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => signIn.social({ provider: "google", callbackURL: "/rotas" })}
              >
                <CalendarSyncIcon />
                Conectar agenda
              </Button>
            )}

            {unmatched.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="max-sm:px-2.5"
                onClick={() => setUnmatchedOpen(true)}
                title="Eventos da agenda sem empresa cadastrada"
              >
                <BuildingIcon />
                <span className="tabular-nums">{unmatched.length}</span>
                <span className="max-sm:sr-only">sem empresa</span>
              </Button>
            )}

            <RoutePicker
              routes={routes}
              activeId={route?.id ?? null}
              today={today}
              onPick={(day, id) => {
                setSelectedDay(day);
                setSelectedRouteId(id);
              }}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative max-sm:size-10 max-sm:px-0"
                  aria-busy={actionsBusy}
                  title={actionsFailed ? "A última ação falhou" : undefined}
                >
                  {actionsBusy ? <Loader2Icon className="animate-spin" /> : <EllipsisIcon />}
                  <span className="max-sm:sr-only">Ações</span>
                  {actionsFailed && (
                    <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-background">
                      <span className="sr-only">(a última ação falhou)</span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuItem
                  className="items-start py-2"
                  disabled={autoRoute.isPending}
                  onClick={() => autoRoute.mutate()}
                >
                  {autoRoute.isPending ? (
                    <Loader2Icon className="mt-0.5 animate-spin" />
                  ) : (
                    <SparklesIcon className="mt-0.5" />
                  )}
                  <span className="flex flex-col">
                    <span className="font-medium">Gerar rota agora</span>
                    <span className="text-xs text-muted-foreground">Empresas agendadas + agenda, na melhor ordem</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="items-start py-2"
                  disabled={syncCalendar.isPending}
                  onClick={() => syncCalendar.mutate()}
                >
                  {syncCalendar.isPending ? (
                    <Loader2Icon className="mt-0.5 animate-spin" />
                  ) : (
                    <CalendarSyncIcon className="mt-0.5" />
                  )}
                  <span className="flex flex-col">
                    <span className="font-medium">Atualizar pela agenda</span>
                    <span className="text-xs text-muted-foreground">Cria e ajusta rotas a partir dos eventos</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="items-start py-2" onClick={() => setUnmatchedOpen(true)}>
                  <BuildingIcon className="mt-0.5" />
                  <span className="flex flex-col">
                    <span className="font-medium">
                      Eventos sem empresa{unmatched.length > 0 && ` (${unmatched.length})`}
                    </span>
                    <span className="text-xs text-muted-foreground">Cadastrar empresa ou marcar como não é visita</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="items-start py-2" onClick={() => setAutoCheckin(!autoCheckin)}>
                  {autoCheckin ? <LocateFixedIcon className="mt-0.5" /> : <LocateOffIcon className="mt-0.5" />}
                  <span className="flex flex-col">
                    <span className="font-medium">Check-in automático: {autoCheckin ? "ligado" : "desligado"}</span>
                    <span className="text-xs text-muted-foreground">
                      Na rota de hoje, marca a parada ao ficar 1 min nela e grava o trajeto
                    </span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setManageOpen(true)}>
                  <Settings2Icon />
                  Gerenciar rotas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {notice && (
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            className={cn(
              "flex items-center gap-3 border-t px-3 py-1.5 text-sm sm:px-4",
              notice.tone === "error" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <span className="min-w-0 flex-1">{notice.text}</span>
            {notice.action && (
              <Button variant="outline" size="sm" onClick={notice.action.run}>
                {notice.action.label}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={notice.dismiss} aria-label="Fechar aviso">
              <XIcon />
            </Button>
          </div>
        )}
      </header>

      {manageSheet}

      {!route ? (
        <div className="flex-1 min-h-0">
          <EmptyDay
            dayLabel={relativeDayLabel(effectiveDay)}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={goPrev}
            onNext={goNext}
            onManage={() => setManageOpen(true)}
            onGenerate={effectiveDay === today ? () => autoRoute.mutate() : undefined}
            generating={autoRoute.isPending}
          />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          <StopsPanel
            route={route}
            mode={mode}
            visibleOnMobile={mobileTab === "stops"}
            loadingStopId={loadingStopId}
            onToggle={handleToggle}
            onMove={moveStop}
            onReorder={reorderStops}
            onManage={() => setManageOpen(true)}
            onStatusChange={handleStatusChange}
          />

          <div className={cn("flex-1 min-w-0", mobileTab === "map" ? "flex" : "hidden sm:block")}>
            <RouteMap stops={route.stops} dark={resolvedTheme === "dark"} userImage={userImage} trail={trail} />
          </div>
        </div>
      )}

      {route && (
        <nav className="shrink-0 border-t bg-background px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden">
          <div role="tablist" aria-label="Visualização" className="grid grid-cols-2 rounded-full border p-1">
            {(
              [
                { id: "stops", label: "Paradas", Icon: ListIcon },
                { id: "map", label: "Mapa", Icon: MapIcon },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mobileTab === id}
                onClick={() => setMobileTab(id)}
                className={cn(
                  "flex h-10 items-center justify-center gap-1.5 rounded-full text-sm transition-colors",
                  mobileTab === id
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
