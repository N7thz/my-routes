"use client";

import Link from "next/link";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { todayKey } from "@/lib/dates";
import { eventStart, type CalendarEvent } from "@/lib/google-calendar-service";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Janela do dia local. Montada a partir da chave do dia para a queryKey ficar estável entre renders. */
function todayRange() {
  const key = todayKey();
  return {
    timeMin: new Date(`${key}T00:00:00`).toISOString(),
    timeMax: new Date(`${key}T23:59:59.999`).toISOString(),
  };
}

function timeLabel(event: CalendarEvent): string {
  return event.start.dateTime ? event.start.dateTime.slice(11, 16) : "Dia todo";
}

export function TodayEventsCard() {
  const { data, isPending, isError } = useGoogleCalendar(todayRange());

  const unavailable = data && !Array.isArray(data);
  const events = Array.isArray(data)
    ? data
        .filter((e) => e.status !== "cancelled")
        .sort((a, b) => eventStart(a).localeCompare(eventStart(b)))
    : [];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Compromissos de hoje</h2>
        <Link href="/agenda" className="text-sm font-medium text-primary hover:underline">
          Ver agenda
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          {isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">Não deu pra carregar a agenda agora.</p>
          ) : unavailable ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="size-4 shrink-0" />
              <span>
                Google Agenda não conectado.{" "}
                <Link href="/agenda" className="font-medium text-primary hover:underline">
                  Conectar
                </Link>
              </span>
            </p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada marcado pra hoje.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="flex w-16 shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                    <ClockIcon className="size-3" />
                    {timeLabel(event)}
                  </span>
                  <span className="min-w-0 text-sm leading-snug">{event.summary || "(sem título)"}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
