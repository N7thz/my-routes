import { type CompanyGroupRecord } from "@/hooks/use-company-groups";
import type { CompanyRecord } from "@/lib/company-service";
import type { CompanyStatus } from "@/lib/company-service";
import { type RunrunitTask } from "@/lib/runrunit";
import { eventStart, type CalendarEvent } from "@/lib/google-calendar-service";

export type EnrichedCompany = CompanyRecord & {
  group: CompanyGroupRecord | null;
  tasks: RunrunitTask[];
  events: CalendarEvent[];
  openCount: number;
  closedCount: number;
  urgentCount: number;
  overdueCount: number;
  projectNames: string[];
  nextEvent: CalendarEvent | null;
};

export type SortKey = "name" | "open" | "urgent" | "overdue" | "closed" | "status" | "nextEvent" | "group";
export type SortDir = "asc" | "desc";

export const PER_PAGE_OPTIONS = [12, 24, 48, 96] as const;
export type PerPage = (typeof PER_PAGE_OPTIONS)[number];

export const SORT_KEYS = ["name", "open", "urgent", "overdue", "closed", "status", "nextEvent", "group"] as const;
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
  CONCLUIDO: { label: "Concluído", variant: "outline", className: "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700" },
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
  tasks: RunrunitTask[],
  events: CalendarEvent[],
  groups: CompanyGroupRecord[]
): EnrichedCompany[] {
  const now = new Date();
  const groupsById = new Map(groups.map((g) => [g.id, g]));

  return companies.map((company) => {
    const nameLower = company.name.toLowerCase();

    const matched = tasks.filter(
      (t) => t.client_name?.toLowerCase() === nameLower
    );

    const matchedEvents = events.filter((e) =>
      (e.summary ?? "").toLowerCase().includes(nameLower)
    );

    const nextEvent =
      matchedEvents
        .filter((e) => eventStartDate(e) > now)
        .sort((a, b) => eventStartDate(a).getTime() - eventStartDate(b).getTime())[0] ?? null;

    const projects = [...new Set(matched.map((t) => t.project_name).filter(Boolean) as string[])];

    return {
      ...company,
      group: company.groupId ? groupsById.get(company.groupId) ?? null : null,
      tasks: matched,
      events: matchedEvents,
      openCount: matched.filter((t) => !t.is_closed).length,
      closedCount: matched.filter((t) => t.is_closed).length,
      urgentCount: matched.filter((t) => t.is_urgent && !t.is_closed).length,
      overdueCount: matched.filter((t) => t.overdue === "hard_overdue" && !t.is_closed).length,
      projectNames: projects,
      nextEvent,
    };
  });
}

export function sortCompanies(list: EnrichedCompany[], key: SortKey, dir: SortDir): EnrichedCompany[] {
  return [...list].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "name": cmp = a.name.localeCompare(b.name, "pt-BR"); break;
      case "open": cmp = a.openCount - b.openCount; break;
      case "urgent": cmp = a.urgentCount - b.urgentCount; break;
      case "overdue": cmp = a.overdueCount - b.overdueCount; break;
      case "closed": cmp = a.closedCount - b.closedCount; break;
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
