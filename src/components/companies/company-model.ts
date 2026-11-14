import { type CompanyGroupRecord } from "@/hooks/use-company-groups";
import type { CompanyRecord } from "@/lib/company-service";
import type { CompanyStatus } from "@/lib/company-service";
import { eventStart, type CalendarEvent } from "@/lib/google-calendar-service";

export type EnrichedCompany = CompanyRecord & {
  group: CompanyGroupRecord | null;
  events: CalendarEvent[];
  nextEvent: CalendarEvent | null;
};

export type SortKey = "name" | "status" | "nextEvent" | "group";
export type SortDir = "asc" | "desc";

/** Recortes pela data agendada da empresa (`Company.date`). */
export const PERIOD_KEYS = ["hoje", "semana", "mes", "atrasadas"] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
  atrasadas: "Atrasadas",
};

/** Dia local no formato AAAA-MM-DD. */
function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * A data da empresa é gravada como "horário de parede" em UTC (ver
 * `combineDateTime`), então o dia dela é o começo da string ISO, comparado com
 * o dia local de hoje. A semana vai de segunda a domingo.
 */
export function matchesPeriod(date: Date | string | null, period: PeriodKey, now = new Date()): boolean {
  if (!date) return false;
  const day = new Date(date).toISOString().slice(0, 10);
  const today = localDayKey(now);
  switch (period) {
    case "hoje":
      return day === today;
    case "mes":
      return day.slice(0, 7) === today.slice(0, 7);
    case "atrasadas":
      return day < today;
    case "semana": {
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return day >= localDayKey(monday) && day <= localDayKey(sunday);
    }
  }
}

export const PER_PAGE_OPTIONS = [12, 24, 48, 96] as const;
export type PerPage = (typeof PER_PAGE_OPTIONS)[number];

export const SORT_KEYS = ["name", "status", "nextEvent", "group"] as const;
export const SORT_DIRS = ["asc", "desc"] as const;
export const VIEW_MODES = ["cards", "table"] as const;
export const STATUS_KEYS = ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO", "REVISAO"] as const;

// Valor usado no filtro/Select para representar "sem grupo" (Radix Select não aceita "").
export const NO_GROUP = "none";

export const STATUS_CONFIG: Record<
  CompanyStatus,
  { label: string; variant: "destructive" | "secondary" | "outline" | "default"; className?: string }
> = {
  PENDENTE: { label: "Pendente", variant: "destructive" },
  EM_ANDAMENTO: { label: "Em Andamento", variant: "default" },
  CONCLUIDO: {
    label: "Concluído",
    variant: "outline",
    className:
      "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700",
  },
  REVISAO: { label: "Revisão", variant: "outline" },
};

export function eventStartDate(event: CalendarEvent): Date {
  return new Date(eventStart(event));
}

// Combina data (YYYY-MM-DD) + hora (HH:mm) num instante ISO, tratando o horário
// informado como "relógio de parede" (gravado e lido em UTC), evitando
// deslocamento por fuso entre cliente e servidor.
export function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  return `${date}T${time || "00:00"}:00.000Z`;
}

// Extrai a hora (HH:mm) de uma data salva; vazio quando é meia-noite (sem hora).
export function timeFromDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 ? "" : d.toISOString().slice(11, 16);
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const dateStr = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return dateStr;
  const timeStr = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${dateStr} às ${timeStr}`;
}

export function enrichCompanies(
  companies: CompanyRecord[],
  events: CalendarEvent[],
  groups: CompanyGroupRecord[],
): EnrichedCompany[] {
  const now = new Date();
  const groupsById = new Map(groups.map((g) => [g.id, g]));

  return companies.map((company) => {
    const nameLower = company.name.toLowerCase();

    const matchedEvents = events.filter((e) => (e.summary ?? "").toLowerCase().includes(nameLower));

    const nextEvent =
      matchedEvents
        .filter((e) => eventStartDate(e) > now)
        .sort((a, b) => eventStartDate(a).getTime() - eventStartDate(b).getTime())[0] ?? null;

    return {
      ...company,
      group: company.groupId ? (groupsById.get(company.groupId) ?? null) : null,
      events: matchedEvents,
      nextEvent,
    };
  });
}

export function sortCompanies(list: EnrichedCompany[], key: SortKey, dir: SortDir): EnrichedCompany[] {
  return [...list].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "name":
        cmp = a.name.localeCompare(b.name, "pt-BR");
        break;
      case "status":
        cmp = (a.status ?? "").localeCompare(b.status ?? "", "pt-BR");
        break;
      case "group":
        // Empresas sem grupo ficam por último na ordem ascendente.
        cmp = (a.group?.name ?? "￿").localeCompare(b.group?.name ?? "￿", "pt-BR");
        break;
      case "nextEvent": {
        const da = a.nextEvent ? eventStartDate(a.nextEvent).getTime() : Infinity;
        const db = b.nextEvent ? eventStartDate(b.nextEvent).getTime() : Infinity;
        cmp = da - db;
        break;
      }
    }
    return dir === "asc" ? cmp : -cmp;
  });
}
