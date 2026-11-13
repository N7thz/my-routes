import { dateFromKey, todayKey } from "@/lib/dates";
import type { RouteStatus, StopRecord } from "@/lib/route-service";

/** Chave do "dia" que agrupa as rotas sem data. */
export const UNDATED = "__undated__";

export const DAY_STATUS_CONFIG: Record<RouteStatus, { label: string; className: string }> = {
  RASCUNHO: {
    label: "Rascunho",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-transparent",
  },
  EM_ANDAMENTO: {
    label: "Em andamento",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-transparent",
  },
  CONCLUIDA: {
    label: "Concluída",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent",
  },
};

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

export function mapsUrl(stops: StopRecord[]): string {
  const addrs = stops.map((s) => encodeURIComponent(s.address));
  return `https://www.google.com/maps/dir/${addrs.join("/")}`;
}
