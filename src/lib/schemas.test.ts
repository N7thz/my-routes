import { describe, expect, test } from "bun:test";
import {
  companyCreateSchema,
  companyUpdateSchema,
  routeGenerateSchema,
  stopReorderSchema,
  stopVisitedSchema,
} from "@/lib/schemas";

describe("companyCreateSchema", () => {
  test("exige nome não vazio", () => {
    expect(companyCreateSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(companyCreateSchema.safeParse({}).success).toBe(false);
  });

  test("rejeita status fora do enum", () => {
    expect(companyCreateSchema.safeParse({ name: "X", status: "QUALQUER" }).success).toBe(false);
  });

  test("texto vazio vira null e campo ausente continua ausente", () => {
    const parsed = companyCreateSchema.parse({ name: " Empresa ", cnpj: "", address: "  " });
    expect(parsed.name).toBe("Empresa");
    expect(parsed.cnpj).toBeNull();
    expect(parsed.address).toBeNull();
    expect(parsed.observations).toBeUndefined();
  });

  test("ignora campos desconhecidos", () => {
    const parsed = companyCreateSchema.parse({ name: "X", id: "hack", notionId: "y" });
    expect(parsed).not.toHaveProperty("id");
    expect(parsed).not.toHaveProperty("notionId");
  });
});

describe("datas", () => {
  test("aceita dia e data/hora ISO; vazio limpa", () => {
    expect(companyUpdateSchema.parse({ date: "2026-11-12" }).date).toBe("2026-11-12");
    expect(companyUpdateSchema.parse({ date: "2026-11-12T09:00:00.000Z" }).date).toBe("2026-11-12T09:00:00.000Z");
    expect(companyUpdateSchema.parse({ date: "" }).date).toBeNull();
    expect(companyUpdateSchema.parse({}).date).toBeUndefined();
  });

  test("rejeita data inválida", () => {
    expect(companyUpdateSchema.safeParse({ date: "amanhã" }).success).toBe(false);
  });

  test("gerar rota exige AAAA-MM-DD", () => {
    expect(routeGenerateSchema.safeParse({ date: "2026-11-12" }).success).toBe(true);
    expect(routeGenerateSchema.safeParse({ date: "12/11/2026" }).success).toBe(false);
  });
});

describe("paradas", () => {
  test("visited padrão é true", () => {
    expect(stopVisitedSchema.parse({}).visited).toBe(true);
    expect(stopVisitedSchema.parse({ visited: false }).visited).toBe(false);
  });

  test("reordenar exige lista de ids", () => {
    expect(stopReorderSchema.safeParse({ orderedIds: [] }).success).toBe(false);
    expect(stopReorderSchema.safeParse({ orderedIds: ["a", 1] }).success).toBe(false);
    expect(stopReorderSchema.safeParse({ orderedIds: ["a", "b"] }).success).toBe(true);
  });
});
