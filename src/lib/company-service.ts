import "server-only";
import { Client, isFullPage } from "@notionhq/client";
import type { CompanyStatus } from "../../prisma/generated/enums";
import { prisma } from "@/lib/prisma";

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
  createdAt: Date;
  updatedAt: Date;
};

const NOTION_DB_ID = "e2279539b63b47668b7b6213f49cf96d";

const STATUS_MAP: Record<string, CompanyStatus> = {
  Pendente: "PENDENTE",
  "Em Andamento": "EM_ANDAMENTO",
  "Concluído": "CONCLUIDO",
  Revisão: "REVISAO",
};

export const STATUS_LABEL: Record<CompanyStatus, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDO: "Concluído",
  REVISAO: "Revisão",
};

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
  return prisma.company.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.cnpj !== undefined && { cnpj: data.cnpj }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.observations !== undefined && { observations: data.observations }),
      ...(data.groupId !== undefined && { groupId: data.groupId }),
      ...(data.date !== undefined && { date: data.date ? new Date(data.date) : null }),
    },
  });
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
  return prisma.company.create({
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
}

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
};

export async function importFromNotion(client: Client): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, total: 0 };
  let cursor: string | undefined;

  do {
    // databases.query not typed in this Notion client version — cast to any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.databases as any).query({
      database_id: NOTION_DB_ID,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const item of response.results) {
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

      const existing = await prisma.company.findUnique({
        where: { notionId: item.id },
      });

      if (existing) {
        await prisma.company.update({
          where: { id: existing.id },
          data: { name, cnpj, observations, status, date },
        });
        result.updated++;
      } else {
        await prisma.company.create({
          data: { name, cnpj, observations, status, date, notionId: item.id },
        });
        result.created++;
      }
    }

    cursor = response.has_more && response.next_cursor ? response.next_cursor : undefined;
  } while (cursor);

  return result;
}
