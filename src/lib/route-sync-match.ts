// Regras puras do sync agenda → rota (sem banco nem rede), separadas para
// poderem ser testadas com `bun test`.
import type { CalendarEvent } from "@/lib/google-calendar-service";

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

/**
 * Paradas que o dia deveria ter: um item por evento com destino conhecido (na
 * ordem do horário), seguido das empresas agendadas para o dia que nenhum
 * evento citou — assim a agenda manda na ordem sem perder o que veio do Notion.
 */
export function buildCandidates(events: CalendarEvent[], companies: DayCompany[]): StopCandidate[] {
  const candidates: StopCandidate[] = [];
  const usedCompanies = new Set<string>();

  for (const event of events) {
    const company = matchCompany(event, companies);
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
