"use client";

import { useRef, useState } from "react";
import { parseAsString, parseAsArrayOf, parseAsStringLiteral, useQueryState } from "nuqs";
import { useRememberedFilters } from "@/hooks/use-remembered-filters";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import type FullCalendarType from "@fullcalendar/react";
import { currentMonthKey } from "@/lib/dates";
import type { CalendarDateRange } from "@/hooks/use-google-calendar";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import { useCompanies } from "@/hooks/use-companies";
import { Card, CardContent } from "@/components/ui/card";
import { COMPANY_COLOR, toCompanyFCEvent, toGoogleFCEvent } from "@/components/calendar/event-mappers";
import { CalendarSkeleton, ConnectGoogleCard } from "@/components/calendar/calendar-states";
import { SourceToggle } from "@/components/calendar/source-toggle";

const SOURCE_KEYS = ["google", "empresas"] as const;
type SourceKey = (typeof SOURCE_KEYS)[number];

/** Fontes ligadas, lembradas entre visitas (o mês fica de fora). */
const PREF_PARSERS = {
  fontes: parseAsArrayOf(parseAsStringLiteral(SOURCE_KEYS))
    .withDefault([...SOURCE_KEYS])
    .withOptions({ shallow: true }),
};

export function GoogleCalendarView() {
  const [month, setMonth] = useQueryState("mes", parseAsString.withOptions({ shallow: true }));
  const calendarRef = useRef<FullCalendarType>(null);
  const [range, setRange] = useState<CalendarDateRange | undefined>();
  useRememberedFilters("agenda", PREF_PARSERS);
  const [activeSources, setActiveSources] = useQueryState("fontes", PREF_PARSERS.fontes);

  const sources = {
    google: activeSources.includes("google"),
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
  const { data: companiesData, isFetching: companiesFetching } = useCompanies();

  const handleDatesSet = (arg: DatesSetArg) => {
    setRange({ timeMin: arg.startStr, timeMax: arg.endStr });
    const current = arg.view.currentStart;
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    setMonth(key);
  };

  const handleEventClick = (arg: EventClickArg) => {
    arg.jsEvent.preventDefault();
    if (arg.event.url) window.open(arg.event.url, "_blank", "noopener,noreferrer");
  };

  const initialDate = month && month >= currentMonthKey() ? `${month}-01` : undefined;

  const googleEvents = Array.isArray(googleData) ? googleData.map(toGoogleFCEvent) : [];
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

  const isFetching = googleLoading || companiesFetching;

  return (
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div
          className={`h-0.5 shrink-0 transition-opacity duration-300 bg-primary ${
            isFetching ? "opacity-100 animate-pulse" : "opacity-0"
          }`}
        />

        <div className="flex items-center justify-end gap-1 px-4 py-2 border-b shrink-0">
          <SourceToggle
            label="Google"
            color="#4285F4"
            active={sources.google}
            onClick={() => toggleSource("google")}
          />
          <SourceToggle
            label="Empresas"
            color={COMPANY_COLOR}
            active={sources.empresas}
            onClick={() => toggleSource("empresas")}
          />
        </div>

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
      </Card>
  );
}
