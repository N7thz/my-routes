// Regras puras do sync agenda → rota (sem banco nem rede), separadas para
// poderem ser testadas com `bun test`.
import { eventStart, type CalendarEvent } from "@/lib/google-calendar-service";

export type DayCompany = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

export function stopFromCompany(company: DayCompany) {
  return {
    companyId: company.id,
    label: company.name,
    address: company.address ?? "",
    lat: company.lat,
    lng: company.lng,
  };
}

export type StopCandidate = {
  calendarEventId: string | null;
  companyId: string | null;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Casa o evento com uma das empresas agendadas para o dia comparando o nome
 * normalizado da empresa com o texto do evento (título + local). Nomes curtos
 * são ignorados para não gerar falso positivo; vence o nome mais longo.
 */
export function matchCompany(event: CalendarEvent, companies: DayCompany[]): DayCompany | null {
  const haystack = normalizeText(`${event.summary ?? ""} ${event.location ?? ""}`);
  if (!haystack) return null;

  let best: DayCompany | null = null;
  let bestLength = 0;
  for (const company of companies) {
    const needle = normalizeText(company.name);
    if (needle.length < 4 || needle.length <= bestLength || !haystack.includes(needle)) continue;
    best = company;
    bestLength = needle.length;
  }
  return best;
}

export type MatchOptions = {
  /**
   * Todas as empresas cadastradas. Um evento que não cita nenhuma empresa
   * agendada para o dia ainda é casado com uma delas pelo nome.
   */
  allCompanies?: DayCompany[];
  /** Títulos normalizados marcados como "não é visita": o evento fica de fora. */
  ignoredTitles?: ReadonlySet<string>;
};

/** Título do evento normalizado: a chave usada para ignorar e agrupar. */
export function eventTitleKey(event: Pick<CalendarEvent, "summary">): string {
  return normalizeText(event.summary ?? "");
}

function isIgnored(event: CalendarEvent, ignoredTitles?: ReadonlySet<string>): boolean {
  if (!ignoredTitles || ignoredTitles.size === 0) return false;
  const key = eventTitleKey(event);
  return key !== "" && ignoredTitles.has(key);
}

/** Empresa do evento: primeiro entre as agendadas para o dia, depois entre todas. */
export function companyForEvent(
  event: CalendarEvent,
  dayCompanies: DayCompany[],
  allCompanies: DayCompany[] = []
): DayCompany | null {
  return matchCompany(event, dayCompanies) ?? matchCompany(event, allCompanies);
}

/**
 * Paradas que o dia deveria ter: um item por evento com destino conhecido (na
 * ordem do horário), seguido das empresas agendadas para o dia que nenhum
 * evento citou — assim a agenda manda na ordem sem perder o que veio do Notion.
 */
export function buildCandidates(
  events: CalendarEvent[],
  companies: DayCompany[],
  { allCompanies = [], ignoredTitles }: MatchOptions = {}
): StopCandidate[] {
  const candidates: StopCandidate[] = [];
  const usedCompanies = new Set<string>();

  for (const event of events) {
    if (isIgnored(event, ignoredTitles)) continue;
    const company = companyForEvent(event, companies, allCompanies);
    if (company && usedCompanies.has(company.id)) continue;

    const address = company?.address?.trim() || event.location?.trim() || "";
    // Sem empresa e sem local não há para onde ir — o evento fica fora da rota.
    if (!address) continue;

    if (company) usedCompanies.add(company.id);
    candidates.push({
      calendarEventId: event.id,
      companyId: company?.id ?? null,
      label: event.summary?.trim() || company?.name || "Evento sem título",
      address,
      lat: company?.lat ?? null,
      lng: company?.lng ?? null,
    });
  }

  for (const company of companies) {
    if (usedCompanies.has(company.id) || !company.address?.trim()) continue;
    candidates.push({
      calendarEventId: null,
      ...stopFromCompany(company),
      address: company.address.trim(),
    });
  }

  return candidates;
}

/** Eventos de mesmo título (ex.: um recorrente) que não casaram com empresa nenhuma. */
export type UnmatchedEvent = {
  /** Título normalizado: chave do grupo e do "ignorar". */
  title: string;
  /** Título como está no primeiro evento. */
  label: string;
  /** Primeiro local informado entre os eventos do grupo. */
  location: string | null;
  /** Dias (AAAA-MM-DD) com o evento, em ordem. */
  days: string[];
  /** Início do primeiro evento, como veio da agenda (data ou data-hora). */
  firstStart: string;
  count: number;
};

/**
 * Eventos que não citam nenhuma empresa cadastrada, agrupados pelo título:
 * candidatos a virar empresa (ou a serem marcados como "não é visita").
 * Eventos sem título, cancelados ou com título ignorado ficam de fora.
 */
export function findUnmatchedEvents(
  events: CalendarEvent[],
  allCompanies: DayCompany[],
  ignoredTitles?: ReadonlySet<string>
): UnmatchedEvent[] {
  const groups = new Map<string, UnmatchedEvent>();

  const sorted = [...events].sort((a, b) => eventStart(a).localeCompare(eventStart(b)));
  for (const event of sorted) {
    if (event.status === "cancelled" || isIgnored(event, ignoredTitles)) continue;
    const title = eventTitleKey(event);
    if (!title || matchCompany(event, allCompanies)) continue;

    const start = eventStart(event);
    const day = start.slice(0, 10);
    const location = event.location?.trim() || null;
    const group = groups.get(title);
    if (!group) {
      groups.set(title, {
        title,
        label: event.summary?.trim() || title,
        location,
        days: day ? [day] : [],
        firstStart: start,
        count: 1,
      });
      continue;
    }
    group.count++;
    group.location ??= location;
    if (day && !group.days.includes(day)) group.days.push(day);
  }

  return [...groups.values()];
}
