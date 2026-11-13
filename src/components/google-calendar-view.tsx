"use client";

import { useRef, useState } from "react";
import { parseAsString, parseAsArrayOf, parseAsStringLiteral, useQueryState } from "nuqs";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import type FullCalendarType from "@fullcalendar/react";
import type { RunrunitTask } from "@/lib/runrunit";
import { currentMonthKey } from "@/lib/dates";
import type { CalendarDateRange } from "@/hooks/use-google-calendar";
import { RunrunitTaskSheet } from "@/components/runrunit-task-sheet";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import { useRunrunitTasks } from "@/hooks/use-runrunit-tasks";
import { useCompanies } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDaysIcon, ListIcon } from "lucide-react";
import {
  COMPANY_COLOR,
  toCompanyFCEvent,
  toGoogleFCEvent,
  toRunrunitFCEvent,
} from "@/components/calendar/event-mappers";
import { CalendarSkeleton, ConnectGoogleCard } from "@/components/calendar/calendar-states";
import { RunrunitListView } from "@/components/calendar/runrunit-list-view";
import { SourceToggle } from "@/components/calendar/source-toggle";
import { SyncTasksButton } from "@/components/calendar/sync-tasks-button";

type ViewMode = "calendar" | "list";

const SOURCE_KEYS = ["google", "runrunit", "empresas"] as const;
type SourceKey = (typeof SOURCE_KEYS)[number];

export function GoogleCalendarView() {
  const [month, setMonth] = useQueryState("mes", parseAsString.withOptions({ shallow: true }));
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const calendarRef = useRef<FullCalendarType>(null);
  const [range, setRange] = useState<CalendarDateRange | undefined>();
  const [selectedTask, setSelectedTask] = useState<RunrunitTask | null>(null);
  const [activeSources, setActiveSources] = useQueryState(
    "fontes",
    parseAsArrayOf(parseAsStringLiteral(SOURCE_KEYS))
      .withDefault([...SOURCE_KEYS])
      .withOptions({ shallow: true }),
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
          <SyncTasksButton />
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
