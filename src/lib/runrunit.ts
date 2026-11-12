export type RunrunitOverdue = "on_schedule" | "soft_overdue" | "hard_overdue";

export type RunrunitTask = {
  id: number;
  title: string;
  description?: string;
  is_closed: boolean;
  is_urgent: boolean;
  is_scheduled: boolean;
  state: string;
  overdue: RunrunitOverdue;
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

export function runrunitTaskUrl(taskId: number): string {
  return `https://secure.runrun.it/tasks/${taskId}`;
}

const OVERDUE_COLORS: Record<RunrunitOverdue, string> = {
  on_schedule: "#10b981",
  soft_overdue: "#f97316",
  hard_overdue: "#ef4444",
};

/** Cor da tarefa: cinza se encerrada, vermelha se urgente, senão a do prazo. */
export function taskColor(task: RunrunitTask): string {
  if (task.is_closed) return "#6b7280";
  if (task.is_urgent) return "#ef4444";
  return OVERDUE_COLORS[task.overdue ?? "on_schedule"];
}

export const OVERDUE_BADGE: Record<
  RunrunitOverdue,
  { label: string; variant: "destructive" | "secondary" | "outline" }
> = {
  hard_overdue: { label: "Atrasado", variant: "destructive" },
  soft_overdue: { label: "Prazo próximo", variant: "secondary" },
  on_schedule: { label: "No prazo", variant: "outline" },
};

/** Data que melhor representa a tarefa numa lista: quando fechou, senão quando é esperada. */
export function taskBestDate(task: RunrunitTask): string | null {
  return (
    task.close_date ??
    task.desired_date ??
    task.gantt_bar_start_date ??
    task.estimated_delivery_date ??
    null
  );
}

/** Data em que a tarefa aparece no calendário: a esperada, senão a que houver. */
export function taskCalendarDate(task: RunrunitTask): string | null {
  return (
    task.desired_date ??
    task.gantt_bar_start_date ??
    task.close_date ??
    task.estimated_delivery_date ??
    null
  );
}

/** Início e fim com horário, quando a tarefa foi agendada; senão ela é de dia inteiro. */
export function taskTimeRange(task: RunrunitTask): { start: string; end: string } | null {
  if (!task.is_scheduled || !task.scheduled_start_time || !task.gantt_bar_end_date) return null;
  return { start: task.scheduled_start_time, end: task.gantt_bar_end_date };
}

export function formatEstimate(seconds?: number): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
