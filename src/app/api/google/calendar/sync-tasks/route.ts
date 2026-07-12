import { NextResponse } from "next/server";
import { getGoogleCalendarToken } from "@/lib/google-auth";
import {
  createCalendarEvent,
  fetchSyncedTaskIds,
  CalendarApiError,
  type NewCalendarEvent,
} from "@/lib/google-calendar-service";
import {
  isRunrunitConfigured,
  getAllRunrunitTasks,
  type RunrunitTask,
} from "@/lib/runrunit-service";

const DAY_MS = 24 * 60 * 60 * 1000;

function nextDay(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Monta o evento a partir de uma tarefa; usa horário se agendada, senão dia inteiro. */
function eventInputForTask(task: RunrunitTask): NewCalendarEvent | null {
  const hasTimeRange =
    task.is_scheduled && task.scheduled_start_time && task.gantt_bar_end_date;

  const description = [
    `Tarefa Runrunit #${task.id}`,
    `https://secure.runrun.it/tasks/${task.id}`,
    task.client_name ? `Cliente: ${task.client_name}` : null,
    task.project_name ? `Projeto: ${task.project_name}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const base = { summary: task.title, description, runrunitTaskId: task.id };

  if (hasTimeRange) {
    return {
      ...base,
      start: { dateTime: task.scheduled_start_time! },
      end: { dateTime: task.gantt_bar_end_date! },
    };
  }

  const date = (task.desired_date ?? "").slice(0, 10);
  if (!date) return null;
  return { ...base, start: { date }, end: { date: nextDay(date) } };
}

export async function POST() {
  if (!isRunrunitConfigured()) {
    return NextResponse.json({ reason: "not-configured" }, { status: 404 });
  }

  const token = await getGoogleCalendarToken();
  if (!token.hasCalendarScope) {
    return NextResponse.json({ reason: token.reason }, { status: 404 });
  }
  if (!token.canWriteEvents) {
    // Conta conectada só com escopo de leitura — precisa reconectar.
    return NextResponse.json({ reason: "no-write-scope" }, { status: 403 });
  }

  // Só tarefas abertas atribuídas a mim com data desejada definida.
  const tasks = await getAllRunrunitTasks();
  const candidates = tasks
    .filter((t) => !t.is_closed && t.desired_date)
    .map((task) => ({ task, input: eventInputForTask(task) }))
    .filter(
      (c): c is { task: RunrunitTask; input: NewCalendarEvent } => c.input !== null
    );

  if (candidates.length === 0) {
    return NextResponse.json({ created: 0, skipped: 0, total: 0, events: [] });
  }

  // Janela de deduplicação = intervalo coberto pelas datas das tarefas.
  const startTimes = candidates.map((c) =>
    new Date(c.input.start.dateTime ?? c.input.start.date!).getTime()
  );
  const timeMin = new Date(Math.min(...startTimes) - DAY_MS).toISOString();
  const timeMax = new Date(Math.max(...startTimes) + 2 * DAY_MS).toISOString();

  const synced = await fetchSyncedTaskIds(token.accessToken, { timeMin, timeMax });
  const toCreate = candidates.filter((c) => !synced.has(c.task.id));

  const events: { taskId: number; title: string }[] = [];
  try {
    for (const c of toCreate) {
      await createCalendarEvent(token.accessToken, c.input);
      events.push({ taskId: c.task.id, title: c.task.title });
    }
  } catch (err) {
    // Token sem permissão de escrita (escopo do banco pode estar dessincronizado
    // do que o Google realmente concedeu) → pedir reconexão em vez de crashar.
    if (err instanceof CalendarApiError && (err.status === 401 || err.status === 403)) {
      return NextResponse.json({ reason: "no-write-scope" }, { status: 403 });
    }
    throw err;
  }

  return NextResponse.json({
    created: events.length,
    skipped: candidates.length - toCreate.length,
    total: candidates.length,
    events,
  });
}
