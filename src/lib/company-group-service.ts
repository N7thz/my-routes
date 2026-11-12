import "server-only";
import { prisma } from "@/lib/prisma";

export type CompanyGroupRecord = {
  id: string;
  name: string;
  color: string | null;
  companyCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CompanyGroupInput = {
  name?: string;
  color?: string | null;
  // Quando presente, substitui a lista de empresas do grupo: as listadas entram
  // (saindo do grupo anterior, se houver) e as que não estão mais saem.
  companyIds?: string[];
};

export class GroupNameTakenError extends Error {
  constructor() {
    super("Já existe um grupo com esse nome");
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export async function listCompanyGroups(): Promise<CompanyGroupRecord[]> {
  const groups = await prisma.companyGroup.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { companies: true } } },
  });
  return groups.map(({ _count, ...g }) => ({ ...g, companyCount: _count.companies }));
}

export async function createCompanyGroup(data: CompanyGroupInput & { name: string }): Promise<CompanyGroupRecord> {
  try {
    return await prisma.$transaction(async (tx) => {
      const group = await tx.companyGroup.create({
        data: { name: data.name.trim(), color: data.color ?? null },
      });
      if (data.companyIds?.length) {
        await tx.company.updateMany({
          where: { id: { in: data.companyIds } },
          data: { groupId: group.id },
        });
      }
      return { ...group, companyCount: data.companyIds?.length ?? 0 };
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new GroupNameTakenError();
    throw err;
  }
}

export async function updateCompanyGroup(id: string, data: CompanyGroupInput): Promise<CompanyGroupRecord> {
  try {
    return await prisma.$transaction(async (tx) => {
      if (data.companyIds !== undefined) {
        await tx.company.updateMany({
          where: { groupId: id, id: { notIn: data.companyIds } },
          data: { groupId: null },
        });
        await tx.company.updateMany({
          where: { id: { in: data.companyIds } },
          data: { groupId: id },
        });
      }
      const { _count, ...group } = await tx.companyGroup.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.color !== undefined && { color: data.color }),
        },
        include: { _count: { select: { companies: true } } },
      });
      return { ...group, companyCount: _count.companies };
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new GroupNameTakenError();
    throw err;
  }
}

// As empresas do grupo não são excluídas — ficam sem grupo (onDelete: SetNull).
export async function deleteCompanyGroup(id: string): Promise<void> {
  await prisma.companyGroup.delete({ where: { id } });
}
