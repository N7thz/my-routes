import { dateFromKey, todayKey } from "@/lib/dates";

/** Chave do "dia" que agrupa as rotas sem data. */
export const UNDATED = "__undated__";

export function relativeDayLabel(key: string): string {
  if (key === UNDATED) return "Sem data";
  const today = todayKey();
  if (key === today) return "Hoje";
  const base = dateFromKey(today);
  const yesterday = new Date(base);
  yesterday.setDate(base.getDate() - 1);
  const tomorrow = new Date(base);
  tomorrow.setDate(base.getDate() + 1);
  const d = dateFromKey(key);
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  if (d.toDateString() === tomorrow.toDateString()) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function fullDayLabel(key: string): string {
  if (key === UNDATED) return "Rotas sem data definida";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateFromKey(key));
}

export function visitedTimeLabel(dt: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(dt));
}
