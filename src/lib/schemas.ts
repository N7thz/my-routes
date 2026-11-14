import { z } from "zod";
import { CompanyStatus, RouteStatus } from "../../prisma/generated/enums";

/** Texto opcional: string vazia vira null (formulários mandam "" para limpar). */
const optionalText = z
  .string()
  .trim()
  .nullish()
  // undefined = campo não enviado (não mexe); "" ou null = limpar.
  .transform((v) => (v === undefined ? undefined : v || null));

const requiredText = (label: string) => z.string({ error: `${label} é obrigatório` }).trim().min(1, `${label} é obrigatório`);

/** Data em ISO (YYYY-MM-DD ou data/hora completa); "" ou null limpam. */
const isoDate = z
  .string()
  .nullish()
  .transform((v) => (v === undefined ? undefined : v || null))
  .refine((v) => v == null || !Number.isNaN(new Date(v).getTime()), "data inválida");

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida (use AAAA-MM-DD)");

const coordinate = z.number().finite().nullish();

// --- Empresas ---

export const companyCreateSchema = z.object({
  name: requiredText("Nome"),
  cnpj: optionalText,
  address: optionalText,
  date: isoDate,
  status: z.enum(CompanyStatus).nullish(),
  observations: optionalText,
  groupId: z.string().nullish(),
});

export const companyUpdateSchema = companyCreateSchema.partial();

// --- Grupos ---

export const companyGroupCreateSchema = z.object({
  name: requiredText("Nome"),
  color: z.string().nullish(),
  companyIds: z.array(z.string()).optional(),
});

export const companyGroupUpdateSchema = companyGroupCreateSchema.partial();

// --- Rotas ---

export const routeCreateSchema = z.object({
  name: requiredText("Nome"),
  date: isoDate,
});

export const routeUpdateSchema = z.object({
  name: requiredText("Nome").optional(),
  date: isoDate,
  status: z.enum(RouteStatus).optional(),
});

export const routeGenerateSchema = z.object({ date: dayKey });

/** Janela da lista de rotas (?from=&to=), dias inclusivos. */
export const routeRangeSchema = z
  .object({ from: dayKey.optional(), to: dayKey.optional() })
  .refine((r) => !r.from || !r.to || r.from <= r.to, "from depois de to");

export const stopCreateSchema = z.object({
  companyId: z.string().nullish(),
  label: optionalText,
  address: requiredText("Endereço"),
  lat: coordinate,
  lng: coordinate,
});

export const stopVisitedSchema = z.object({ visited: z.boolean().default(true) });

export const stopReorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1, "orderedIds vazio"),
});

// --- Filtros salvos ---

/** Telas que têm filtros nomeados. */
export const SAVED_FILTER_SCREENS = ["empresas", "agenda"] as const;
export type SavedFilterScreen = (typeof SAVED_FILTER_SCREENS)[number];

export const savedFilterScreenSchema = z.enum(SAVED_FILTER_SCREENS, { error: "tela inválida" });

export const savedFilterCreateSchema = z.object({
  screen: savedFilterScreenSchema,
  name: requiredText("Nome").max(60, "Nome com no máximo 60 caracteres"),
  // Query string dos filtros, no formato do nuqs ("" = filtros padrão).
  query: z.string().max(2000),
});
