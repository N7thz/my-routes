import "server-only";
import {
  APIErrorCode,
  Client,
  isFullPage,
  isNotionClientError,
  iteratePaginatedAPI,
} from "@notionhq/client";
import type { CompanyStatus } from "../../prisma/generated/enums";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodeCompany } from "@/lib/geocode";
import { HttpError, NotFoundError } from "@/lib/http-errors";
import { notionPageUrl } from "@/lib/notion";
import { formatDate } from "@/lib/dates";
import { appendTree, fillTableCells, readInspectionTemplate } from "@/lib/notion-template";

export type { CompanyStatus };

export type CompanyRecord = {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  date: Date | null;
  status: CompanyStatus | null;
  observations: string | null;
  notionId: string | null;
  groupId: string | null;
  /** Endereço que o geocodificador não encontrou (fica fora do mapa). */
  geocodeFailedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const NOTION_DB_ID = process.env.NOTION_COMPANIES_DB_ID ?? "e2279539b63b47668b7b6213f49cf96d";

const STATUS_MAP: Record<string, CompanyStatus> = {
  Pendente: "PENDENTE",
  "Em Andamento": "EM_ANDAMENTO",
  "Concluído": "CONCLUIDO",
  Revisão: "REVISAO",
};

const NOTION_STATUS: Record<CompanyStatus, string> = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([label, status]) => [status, label])
) as Record<CompanyStatus, string>;

/**
 * Na API 2025-09-03 do Notion o database é um contêiner: consultas e criação
 * de páginas vão para a fonte de dados (data source) dentro dele.
 */
async function notionDataSourceId(client: Client): Promise<string> {
  const db = await client.databases.retrieve({ database_id: NOTION_DB_ID });
  const id = "data_sources" in db ? db.data_sources[0]?.id : undefined;
  if (!id) throw new Error("Database do Notion sem fonte de dados");
  return id;
}

export async function listCompanies(): Promise<CompanyRecord[]> {
  return prisma.company.findMany({ orderBy: { name: "asc" } });
}

export type CompanyUpdateInput = {
  name?: string;
  cnpj?: string | null;
  address?: string | null;
  date?: string | null;
  status?: CompanyStatus | null;
  observations?: string | null;
  groupId?: string | null;
};

export async function updateCompany(id: string, data: CompanyUpdateInput): Promise<CompanyRecord> {
  const before =
    data.address !== undefined
      ? await prisma.company.findUnique({ where: { id }, select: { address: true } })
      : null;
  const addressChanged = data.address !== undefined && before?.address !== data.address;

  const company = await prisma.company.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.cnpj !== undefined && { cnpj: data.cnpj }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.observations !== undefined && { observations: data.observations }),
      ...(data.groupId !== undefined && { groupId: data.groupId }),
      ...(data.date !== undefined && { date: data.date ? new Date(data.date) : null }),
      // Endereço novo invalida as coordenadas antigas; o geocode roda depois da resposta.
      ...(addressChanged && { lat: null, lng: null, geocodeFailedAt: null }),
    },
  });
  if (addressChanged && data.address) after(() => geocodeCompany(id));
  return company;
}

export async function deleteCompany(id: string): Promise<void> {
  await prisma.company.delete({ where: { id } });
}

export type CompanyCreateInput = {
  name: string;
  cnpj?: string | null;
  address?: string | null;
  date?: string | null;
  status?: CompanyStatus | null;
  observations?: string | null;
  groupId?: string | null;
};

export async function createCompany(data: CompanyCreateInput): Promise<CompanyRecord> {
  const company = await prisma.company.create({
    data: {
      name: data.name,
      cnpj: data.cnpj ?? null,
      address: data.address ?? null,
      status: data.status ?? null,
      observations: data.observations ?? null,
      groupId: data.groupId ?? null,
      date: data.date ? new Date(data.date) : null,
    },
  });
  if (company.address) after(() => geocodeCompany(company.id));
  return company;
}

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
};

export async function importFromNotion(client: Client): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, total: 0 };
  const dataSourceId = await notionDataSourceId(client);

  // Uma consulta para saber quem já existe, em vez de uma por página do Notion.
  const linked = await prisma.company.findMany({
    where: { notionId: { not: null } },
    select: { id: true, notionId: true },
  });
  const idByNotionId = new Map(linked.map((c) => [c.notionId as string, c.id]));
  const toCreate: { name: string; cnpj: string | null; observations: string | null; status: CompanyStatus | null; date: Date | null; notionId: string }[] = [];

  const rows = iteratePaginatedAPI(client.dataSources.query, {
    data_source_id: dataSourceId,
    page_size: 100,
  });

  for await (const item of rows) {
    if (!isFullPage(item)) { result.skipped++; continue; }
    result.total++;

    const props = item.properties;

    const name =
      props.Empresa?.type === "title"
        ? props.Empresa.title[0]?.plain_text?.trim() ?? ""
        : "";

    if (!name) { result.skipped++; continue; }

    const cnpj =
      props.CNPJ?.type === "rich_text"
        ? (props.CNPJ.rich_text[0]?.plain_text?.trim() || null)
        : null;

    const observations =
      props["Observações"]?.type === "rich_text"
        ? (props["Observações"].rich_text[0]?.plain_text?.trim() || null)
        : null;

    const notionStatus =
      props.Status?.type === "select" ? props.Status.select?.name ?? null : null;
    const status = notionStatus ? (STATUS_MAP[notionStatus] ?? null) : null;

    const rawDate =
      props.Data?.type === "date" ? props.Data.date?.start ?? null : null;
    const date = rawDate ? new Date(rawDate) : null;

    const existingId = idByNotionId.get(item.id);
    if (existingId) {
      await prisma.company.update({
        where: { id: existingId },
        data: { name, cnpj, observations, status, date },
      });
      result.updated++;
    } else {
      toCreate.push({ name, cnpj, observations, status, date, notionId: item.id });
    }
  }

  if (toCreate.length > 0) {
    const { count } = await prisma.company.createMany({ data: toCreate, skipDuplicates: true });
    result.created = count;
  }

  return result;
}

export class CompanyNotFoundError extends NotFoundError {
  constructor() {
    super("Empresa não encontrada");
  }
}

export class NotionTemplateUnavailableError extends HttpError {
  constructor() {
    super(502, "A conexão do Notion não tem acesso à página MODELO INSPEÇÃO");
  }
}

export type NotionPageResult = { notionId: string; url: string; created: boolean };

const richText = (content: string) => [{ type: "text" as const, text: { content: content.slice(0, 2000) } }];

/**
 * Cria no database de empresas do Notion uma página com os dados da empresa e
 * o corpo copiado do "MODELO INSPEÇÃO" (data e local já preenchidos), e guarda
 * o id dela em `notionId`, ligando os dois lados (o import passa a atualizar
 * essa empresa em vez de duplicar). Se a empresa já tem página, devolve a
 * existente sem criar outra.
 */
export async function createNotionPageForCompany(
  client: Client,
  companyId: string
): Promise<NotionPageResult> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new CompanyNotFoundError();
  if (company.notionId) {
    return { notionId: company.notionId, url: notionPageUrl(company.notionId), created: false };
  }

  // Lido antes de criar a página: sem acesso ao modelo, nada fica pela metade.
  let template: Awaited<ReturnType<typeof readInspectionTemplate>>;
  try {
    template = await readInspectionTemplate(client);
  } catch (err) {
    if (isNotionClientError(err) && err.code === APIErrorCode.ObjectNotFound) {
      throw new NotionTemplateUnavailableError();
    }
    throw err;
  }
  fillTableCells(template, {
    "DATA DA INSPEÇÃO": company.date ? formatDate(company.date) : null,
    "LOCAL / UNIDADE": [company.name, company.address].filter(Boolean).join(" — "),
  });

  const page = await client.pages.create({
    parent: { type: "data_source_id", data_source_id: await notionDataSourceId(client) },
    properties: {
      Empresa: { title: richText(company.name) },
      ...(company.cnpj && { CNPJ: { rich_text: richText(company.cnpj) } }),
      ...(company.observations && { "Observações": { rich_text: richText(company.observations) } }),
      ...(company.status && { Status: { select: { name: NOTION_STATUS[company.status] } } }),
      ...(company.date && { Data: { date: { start: company.date.toISOString() } } }),
    },
  });

  try {
    await appendTree(client, page.id, template);
  } catch (err) {
    // Página sem o modelo completo não serve: vai para a lixeira e o usuário tenta de novo.
    await client.pages.update({ page_id: page.id, in_trash: true }).catch(() => {});
    throw err;
  }

  await prisma.company.update({ where: { id: companyId }, data: { notionId: page.id } });

  return {
    notionId: page.id,
    url: "url" in page ? page.url : notionPageUrl(page.id),
    created: true,
  };
}
