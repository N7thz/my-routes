import { eventStart, type CalendarEvent } from "@/lib/google-calendar-service";
import type { CompanyRecord } from "@/lib/company-service";

export const COMPANY_COLOR = "#8b5cf6";

export function toGoogleFCEvent(event: CalendarEvent) {
  return {
    id: `gc-${event.id}`,
    title: event.summary ?? "Sem título",
    start: eventStart(event),
    end: event.end.dateTime ?? event.end.date ?? "",
    allDay: !event.start.dateTime,
    url: event.htmlLink,
    extendedProps: { source: "google" as const, location: event.location },
  };
}

export function toCompanyFCEvent(company: CompanyRecord) {
  if (!company.date) return null;
  // company.date chega serializado como string ISO pela API.
  const dateOnly = new Date(company.date).toISOString().slice(0, 10);

  return {
    id: `co-${company.id}`,
    title: company.name,
    start: dateOnly,
    allDay: true,
    backgroundColor: COMPANY_COLOR,
    borderColor: COMPANY_COLOR,
    extendedProps: {
      source: "company" as const,
      companyId: company.id,
      address: company.address,
      status: company.status,
    },
  };
}
