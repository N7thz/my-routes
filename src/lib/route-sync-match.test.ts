import { describe, expect, test } from "bun:test";
import type { CalendarEvent } from "@/lib/google-calendar-service";
import { buildCandidates, matchCompany, normalizeText, type DayCompany } from "@/lib/route-sync-match";

const company = (id: string, name: string, address: string | null = `Rua ${name}, 1`): DayCompany => ({
  id,
  name,
  address,
  lat: null,
  lng: null,
});

const event = (id: string, summary?: string, location?: string, start = "2026-11-12T09:00:00-03:00") =>
  ({ id, summary, location, start: { dateTime: start }, end: { dateTime: start } }) as CalendarEvent;

describe("normalizeText", () => {
  test("tira acento, caixa e pontuação", () => {
    expect(normalizeText("Padaria São-João LTDA.")).toBe("padaria sao joao ltda");
  });
});

describe("matchCompany", () => {
  const companies = [company("a", "Metalúrgica Silva"), company("b", "Silva"), company("c", "ABC")];

  test("casa pelo nome no título, ignorando acento", () => {
    expect(matchCompany(event("1", "Inspeção metalurgica silva"), companies)?.id).toBe("a");
  });

  test("casa pelo local quando o título não cita", () => {
    expect(matchCompany(event("1", "Visita", "Metalúrgica Silva - Centro"), companies)?.id).toBe("a");
  });

  test("vence o nome mais longo", () => {
    expect(matchCompany(event("1", "Silva e Metalúrgica Silva"), companies)?.id).toBe("a");
  });

  test("ignora nomes curtos (< 4 letras) para evitar falso positivo", () => {
    expect(matchCompany(event("1", "Reunião ABC"), companies)).toBeNull();
  });

  test("sem texto no evento não casa nada", () => {
    expect(matchCompany(event("1"), companies)).toBeNull();
  });
});

describe("buildCandidates", () => {
  test("evento casado usa o endereço da empresa e vem antes das empresas sem evento", () => {
    const companies = [company("a", "Metalúrgica Silva"), company("b", "Padaria Central")];
    const result = buildCandidates([event("e1", "Inspeção Metalúrgica Silva", "outro lugar")], companies);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ calendarEventId: "e1", companyId: "a", address: "Rua Metalúrgica Silva, 1" });
    expect(result[1]).toMatchObject({ calendarEventId: null, companyId: "b" });
  });

  test("evento sem empresa usa o local do evento", () => {
    const result = buildCandidates([event("e1", "Dentista", "Av. Brasil, 100")], []);
    expect(result).toEqual([
      { calendarEventId: "e1", companyId: null, label: "Dentista", address: "Av. Brasil, 100", lat: null, lng: null },
    ]);
  });

  test("evento sem empresa e sem local fica fora", () => {
    expect(buildCandidates([event("e1", "Almoço")], [])).toEqual([]);
  });

  test("dois eventos da mesma empresa geram uma parada só", () => {
    const companies = [company("a", "Metalúrgica Silva")];
    const result = buildCandidates(
      [event("e1", "Metalúrgica Silva manhã"), event("e2", "Metalúrgica Silva tarde")],
      companies
    );
    expect(result.map((c) => c.calendarEventId)).toEqual(["e1"]);
  });

  test("empresa do dia sem endereço não vira parada", () => {
    expect(buildCandidates([], [company("a", "Sem Endereço", null)])).toEqual([]);
  });
});
