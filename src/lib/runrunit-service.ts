import "server-only";

const BASE_URL = "https://secure.runrun.it/api/v1.0";

export type RunrunitTask = {
  id: number;
  title: string;
  description?: string;
  is_closed: boolean;
  is_urgent: boolean;
  is_scheduled: boolean;
  state: string;
  overdue: "on_schedule" | "soft_overdue" | "hard_overdue";
  responsible_id?: string;
  responsible_name?: string;
  project_id?: number;
  project_name?: string;
  client_name?: string;
  board_name?: string;
  board_stage_name?: string;
  type_name?: string;
  type_color?: string;
  desired_date?: string;
  desired_date_with_time?: string;
  estimated_delivery_date?: string;
  gantt_bar_start_date?: string;
  gantt_bar_end_date?: string;
  scheduled_start_time?: string;
  close_date?: string;
  current_estimate_seconds?: number;
  is_subtask?: boolean;
  parent_task_id?: number;
  parent_task_title?: string;
};

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

async function fetchUserTasks(): Promise<RunrunitTask[]> {
  const h = headers();
  const [userId, openRes, closedRes] = await Promise.all([
    getCurrentUserId(),
    fetch(`${BASE_URL}/tasks?limit=200&is_closed=false`, { headers: h, next: { revalidate: 0 } }),
    fetch(`${BASE_URL}/tasks?limit=200&is_closed=true`, { headers: h, next: { revalidate: 0 } }),
  ]);

  if (!openRes.ok) throw new Error(`Runrunit API error: ${openRes.status}`);
  if (!closedRes.ok) throw new Error(`Runrunit API error: ${closedRes.status}`);

  const [open, closed] = await Promise.all([
    openRes.json() as Promise<RunrunitTask[]>,
    closedRes.json() as Promise<RunrunitTask[]>,
  ]);

  return [...open, ...closed].filter((t) => t.responsible_id === userId);
}

export type RunrunitComment = {
  id: number;
  text: string;
  commenter_name?: string;
  user_id?: string;
  is_system_message: boolean;
  is_automation_message: boolean;
  created_at: string;
  quoted_comment_text?: string;
  quoted_comment_user_name?: string;
};

export async function listTaskComments(taskId: number): Promise<RunrunitComment[]> {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/comments`, {
    headers: headers(),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Runrunit comments error: ${res.status}`);
  return res.json();
}

/** Tarefas do mês informado (padrão: mês atual) + tarefas sem data — para o calendário. */
export async function listRunrunitTasks(options?: {
  month?: string; // YYYY-MM
}): Promise<RunrunitTask[]> {
  const mine = await fetchUserTasks();

  const now = new Date();
  const rawMonth =
    options?.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [y, m] = rawMonth.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);

  return mine.filter((t) => {
    const raw =
      t.desired_date ?? t.gantt_bar_start_date ?? t.close_date ?? t.estimated_delivery_date;
    if (!raw) return true;
    const d = new Date(raw);
    return d >= monthStart && d < monthEnd;
  });
}

/** Todas as tarefas do usuário sem filtro de data — para a view de lista. */
export async function getAllRunrunitTasks(): Promise<RunrunitTask[]> {
  return fetchUserTasks();
}
