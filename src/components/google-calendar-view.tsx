"use client";

import { useRef, useState } from "react";
import { parseAsString, parseAsArrayOf, parseAsStringLiteral, useQueryState } from "nuqs";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import type FullCalendarType from "@fullcalendar/react";
import { eventStart, type CalendarEvent } from "@/lib/google-calendar-service";
import {
  OVERDUE_BADGE,
  taskColor,
  formatEstimate,
  runrunitTaskUrl,
  taskBestDate,
  taskCalendarDate,
  taskTimeRange,
  type RunrunitTask,
} from "@/lib/runrunit";
import { currentMonthKey, formatDate } from "@/lib/dates";
import { ApiError } from "@/lib/api-client";
import type { CompanyRecord } from "@/lib/company-service";
import type { CalendarDateRange } from "@/hooks/use-google-calendar";
import { RunrunitTaskSheet } from "@/components/runrunit-task-sheet";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import { useRunrunitList, useRunrunitTasks } from "@/hooks/use-runrunit-tasks";
import { useCompanies } from "@/hooks/use-companies";
import { useSyncTasksToCalendar } from "@/hooks/use-sync-tasks-to-calendar";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  ListIcon,
  CalendarDaysIcon,
  FolderIcon,
  BuildingIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardXIcon,
  CalendarPlusIcon,
  Loader2Icon,
} from "lucide-react";

const COMPANY_COLOR = "#8b5cf6";

function toGoogleFCEvent(event: CalendarEvent) {
  return {
    id: `gc-${event.id}`,
    title: event.summary ?? "Sem título",
    start: eventStart(event),
    end: event.end.dateTime ?? event.end.date ?? "",
    allDay: !event.start.dateTime,
    url: event.htmlLink,
    extendedProps: { source: "google" as const, location: event.location },
  };
}

function toRunrunitFCEvent(task: RunrunitTask) {
  const range = taskTimeRange(task);
  const start = range?.start ?? taskCalendarDate(task);
  if (!start) return null;

  const color = taskColor(task);

  return {
    id: `rr-${task.id}`,
    title:
      task.is_subtask && task.parent_task_title
        ? `${task.parent_task_title} · ${task.title}`
        : task.title,
    start,
    ...(range && { end: range.end }),
    allDay: !range,
    url: runrunitTaskUrl(task.id),
    backgroundColor: color,
    borderColor: color,
    classNames: task.is_closed ? ["rr-event-closed"] : [],
    extendedProps: { source: "runrunit" as const, task },
  };
}

function toCompanyFCEvent(company: CompanyRecord) {
  if (!company.date) return null;
  // company.date chega serializado como string ISO pela API.
  const dateOnly = new Date(company.date).toISOString().slice(0, 10);

  return {
    id: `co-${company.id}`,
    title: company.name,
    start: dateOnly,
    allDay: true,
    backgroundColor: COMPANY_COLOR,
    borderColor: COMPANY_COLOR,
    extendedProps: {
      source: "company" as const,
      companyId: company.id,
      address: company.address,
      status: company.status,
    },
  };
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function RunrunitListView({
  onTaskClick,
}: {
  onTaskClick: (task: RunrunitTask) => void;
}) {
  const { data, isLoading } = useRunrunitList();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const sorted: RunrunitTask[] = !Array.isArray(data)
    ? []
    : [...data].sort((a, b) => {
        const da = taskBestDate(a);
        const db = taskBestDate(b);
        if (da && db) return new Date(db).getTime() - new Date(da).getTime();
        if (da) return -1;
        if (db) return 1;
        return b.id - a.id;
      });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handlePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(data) || sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <ClipboardXIcon className="size-8" />
        <p className="text-sm">Nenhuma tarefa encontrada</p>
      </div>
    );
  }

  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, sorted.length);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b shrink-0">
        <span className="text-xs text-muted-foreground">
          {start}–{end} de {sorted.length} tarefas
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Por página:</span>
          <div className="flex gap-1">
            {PAGE_SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handlePageSize(s)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  pageSize === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {paginated.map((task) => {
          const date = taskBestDate(task);
          const estimate = formatEstimate(task.current_estimate_seconds);
          const overdueBadge = OVERDUE_BADGE[task.overdue ?? "on_schedule"];

          return (
            <button
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="w-full text-left flex gap-3 items-start px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
            >
              <div
                className="mt-1.5 size-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: taskColor(task),
                }}
              />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-sm font-medium leading-snug line-clamp-2">
                  {task.is_subtask && task.parent_task_title && (
                    <span className="text-muted-foreground font-normal">
                      {task.parent_task_title} ·{" "}
                    </span>
                  )}
                  {task.title}
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {task.client_name && (
                    <span className="flex items-center gap-1">
                      <BuildingIcon className="size-3" />
                      {task.client_name}
                    </span>
                  )}
                  {task.project_name && (
                    <span className="flex items-center gap-1">
                      <FolderIcon className="size-3" />
                      {task.project_name}
                    </span>
                  )}
                  {estimate && (
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      {estimate}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {task.is_closed && <Badge variant="secondary">Encerrada</Badge>}
                  {task.is_urgent && !task.is_closed && (
                    <Badge variant="destructive">Urgente</Badge>
                  )}
                  {!task.is_closed && overdueBadge && (
                    <Badge variant={overdueBadge.variant}>{overdueBadge.label}</Badge>
                  )}
                  {task.type_name && <Badge variant="outline">{task.type_name}</Badge>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 mt-0.5 text-right">
                {date ? formatDate(date) : <span className="italic">Sem data</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 px-4 py-2 border-t shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[5rem] text-center">
          Página {safePage} de {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-7 gap-px mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectGoogleCard({ reason }: { reason?: string }) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="size-5" />
          Google Agenda
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {reason === "no-calendar-scope"
            ? "Permissão de calendário não concedida. Reconecte para liberar o acesso."
            : "Conecte sua conta Google para visualizar seus eventos."}
        </p>
        <Button
          variant="outline"
          className="w-fit gap-2"
          onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
        >
          <CalendarIcon className="size-4" />
          {reason === "no-calendar-scope" ? "Reconectar Google Agenda" : "Conectar Google Agenda"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SourceToggle({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? `Ocultar ${label}` : `Mostrar ${label}`}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50"
      }`}
    >
      <span
        className="size-2 rounded-full transition-opacity"
        style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }}
      />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

type ViewMode = "calendar" | "list";

const SOURCE_KEYS = ["google", "runrunit", "empresas"] as const;
type SourceKey = (typeof SOURCE_KEYS)[number];

export function GoogleCalendarView() {
  const [month, setMonth] = useQueryState(
    "mes",
    parseAsString.withOptions({ shallow: true })
  );
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const calendarRef = useRef<FullCalendarType>(null);
  const [range, setRange] = useState<CalendarDateRange | undefined>();
  const [selectedTask, setSelectedTask] = useState<RunrunitTask | null>(null);
  const [activeSources, setActiveSources] = useQueryState(
    "fontes",
    parseAsArrayOf(parseAsStringLiteral(SOURCE_KEYS))
      .withDefault([...SOURCE_KEYS])
      .withOptions({ shallow: true })
  );

  const sources = {
    google: activeSources.includes("google"),
    runrunit: activeSources.includes("runrunit"),
    empresas: activeSources.includes("empresas"),
  };

  const toggleSource = (key: SourceKey) => {
    setActiveSources((prev) => {
      const cur = prev ?? [...SOURCE_KEYS];
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      // Mantém a ordem canônica para a URL ficar estável.
      return SOURCE_KEYS.filter((k) => next.includes(k));
    });
  };

  const { data: googleData, isLoading: googleLoading } = useGoogleCalendar(range);
  const { data: runrunitData, isFetching: runrunitFetching } = useRunrunitTasks();
  const { data: companiesData, isFetching: companiesFetching } = useCompanies();

  const sync = useSyncTasksToCalendar();
  const [syncMsg, setSyncMsg] = useState<
    { type: "ok" | "err"; text: string; canReconnect?: boolean } | null
  >(null);

  const handleSync = () => {
    setSyncMsg(null);
    sync.mutate(undefined, {
      onSuccess: (r) => {
        setSyncMsg({
          type: "ok",
          text:
            r.created > 0
              ? `${r.created} tarefa(s) adicionada(s) à agenda`
              : r.total > 0
                ? "Tarefas já sincronizadas"
                : "Nenhuma tarefa com data para sincronizar",
        });
      },
      onError: (e) => {
        const reason = e instanceof ApiError ? e.reason : undefined;
        const scopeIssue = reason === "no-write-scope" || reason === "no-calendar-scope";
        const text =
          reason
            ? scopeIssue
              ? "Reconecte o Google para permitir escrita na agenda"
              : reason === "not-connected" || reason === "unauthenticated"
                ? "Conecte sua conta Google primeiro"
                : "Runrunit não configurado"
            : "Falha ao sincronizar";
        setSyncMsg({ type: "err", text, canReconnect: scopeIssue });
      },
    });
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    setRange({ timeMin: arg.startStr, timeMax: arg.endStr });
    const current = arg.view.currentStart;
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    setMonth(key);
  };

  const handleEventClick = (arg: EventClickArg) => {
    arg.jsEvent.preventDefault();
    if (arg.event.extendedProps.source === "runrunit") {
      setSelectedTask(arg.event.extendedProps.task as RunrunitTask);
    } else if (arg.event.url) {
      window.open(arg.event.url, "_blank", "noopener,noreferrer");
    }
  };

  const initialDate = month && month >= currentMonthKey() ? `${month}-01` : undefined;

  const googleEvents = Array.isArray(googleData) ? googleData.map(toGoogleFCEvent) : [];
  const runrunitEvents = Array.isArray(runrunitData)
    ? runrunitData.flatMap((t) => {
        const ev = toRunrunitFCEvent(t);
        return ev ? [ev] : [];
      })
    : [];
  const companyEvents = Array.isArray(companiesData)
    ? companiesData.flatMap((c) => {
        const ev = toCompanyFCEvent(c);
        return ev ? [ev] : [];
      })
    : [];

  if (!range && googleLoading) return <CalendarSkeleton />;

  if (!googleLoading && googleData && !Array.isArray(googleData)) {
    return <ConnectGoogleCard reason={googleData.reason} />;
  }

  const isFetching = googleLoading || runrunitFetching || companiesFetching;

  return (
    <>
      <RunrunitTaskSheet task={selectedTask} onClose={() => setSelectedTask(null)} />
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div
          className={`h-0.5 shrink-0 transition-opacity duration-300 bg-primary ${
            isFetching ? "opacity-100 animate-pulse" : "opacity-0"
          }`}
        />

        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleSync}
              disabled={sync.isPending}
              title="Verifica tarefas atribuídas a você e adiciona ao Google Agenda"
            >
              {sync.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CalendarPlusIcon className="size-4" />
              )}
              <span className="hidden sm:inline">Sincronizar tarefas</span>
            </Button>
            {syncMsg && (
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`text-xs truncate ${
                    syncMsg.type === "err" ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {syncMsg.text}
                </span>
                {syncMsg.canReconnect && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs shrink-0"
                    onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
                  >
                    Reconectar
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {viewMode === "calendar" && (
              <div className="flex items-center gap-1 mr-1">
                <SourceToggle
                  label="Google"
                  color="#4285F4"
                  active={sources.google}
                  onClick={() => toggleSource("google")}
                />
                <SourceToggle
                  label="Runrunit"
                  color="#10b981"
                  active={sources.runrunit}
                  onClick={() => toggleSource("runrunit")}
                />
                <SourceToggle
                  label="Empresas"
                  color={COMPANY_COLOR}
                  active={sources.empresas}
                  onClick={() => toggleSource("empresas")}
                />
              </div>
            )}
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="icon"
              className="size-7"
              onClick={() => setViewMode("calendar")}
              title="Calendário"
            >
              <CalendarDaysIcon className="size-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="size-7"
              onClick={() => setViewMode("list")}
              title="Lista"
            >
              <ListIcon className="size-4" />
            </Button>
          </div>
        </div>

        {viewMode === "list" ? (
          <RunrunitListView onTaskClick={setSelectedTask} />
        ) : (
          <CardContent className="p-0 fc-wrapper flex-1 flex flex-col">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={initialDate}
              locale="pt-br"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              buttonText={{
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia",
              }}
              events={[
                ...(sources.google ? googleEvents : []),
                ...(sources.runrunit ? runrunitEvents : []),
                ...(sources.empresas ? companyEvents : []),
              ]}
              datesSet={handleDatesSet}
              eventClick={handleEventClick}
              height="100%"
              expandRows
              eventDisplay="block"
              dayMaxEvents={4}
              nowIndicator
            />
          </CardContent>
        )}
      </Card>
    </>
  );
}
