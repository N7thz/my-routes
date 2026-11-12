import "server-only";
import { taskCalendarDate, type RunrunitComment, type RunrunitTask } from "@/lib/runrunit";

const BASE_URL = "https://secure.runrun.it/api/v1.0";

function headers() {
  const appKey = process.env.RUNRUNIT_APP_KEY;
  const userToken = process.env.RUNRUNIT_USER_TOKEN;
  if (!appKey || !userToken) throw new Error("RUNRUNIT_APP_KEY or RUNRUNIT_USER_TOKEN not set");
  return { "App-Key": appKey, "User-Token": userToken, "Content-Type": "application/json" };
}

export function isRunrunitConfigured(): boolean {
  return !!(process.env.RUNRUNIT_APP_KEY && process.env.RUNRUNIT_USER_TOKEN);
}

async function getCurrentUserId(): Promise<string> {
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: headers(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Runrunit /users/me error: ${res.status}`);
  const me = (await res.json()) as { id: string };
  return me.id;
}

async function fetchTasks(isClosed: boolean): Promise<RunrunitTask[]> {
  const res = await fetch(`${BASE_URL}/tasks?limit=200&is_closed=${isClosed}`, {
    headers: headers(),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Runrunit API error: ${res.status}`);
  return res.json();
}

/**
 * Tarefas (abertas e fechadas) atribuídas ao dono do token. Com `month`
 * (YYYY-MM), só as daquele mês mais as sem data — o recorte do calendário.
 */
export async function listRunrunitTasks(month?: string): Promise<RunrunitTask[]> {
  const [userId, open, closed] = await Promise.all([
    getCurrentUserId(),
    fetchTasks(false),
    fetchTasks(true),
  ]);
  const mine = [...open, ...closed].filter((t) => t.responsible_id === userId);
  if (!month) return mine;

  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);

  return mine.filter((t) => {
    const raw = taskCalendarDate(t);
    if (!raw) return true;
    const d = new Date(raw);
    return d >= monthStart && d < monthEnd;
  });
}

export async function listTaskComments(taskId: number): Promise<RunrunitComment[]> {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/comments`, {
    headers: headers(),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Runrunit comments error: ${res.status}`);
  return res.json();
}
