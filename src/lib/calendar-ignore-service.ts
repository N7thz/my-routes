import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/route-sync-match";
import { HttpError } from "@/lib/http-errors";

export type IgnoredEventTitleRecord = {
  id: string;
  title: string;
  label: string;
  createdAt: Date;
};

export function listIgnoredEventTitles(userId: string): Promise<IgnoredEventTitleRecord[]> {
  return prisma.ignoredEventTitle.findMany({
    where: { userId },
    orderBy: { label: "asc" },
    select: { id: true, title: true, label: true, createdAt: true },
  });
}

/** Títulos normalizados que a sincronização com a agenda deve pular. */
export async function ignoredTitleSet(userId: string): Promise<Set<string>> {
  const rows = await prisma.ignoredEventTitle.findMany({ where: { userId }, select: { title: true } });
  return new Set(rows.map((r) => r.title));
}

/** Marca o título como "não é visita". Repetir o mesmo título não duplica. */
export async function ignoreEventTitle(userId: string, label: string): Promise<IgnoredEventTitleRecord> {
  const title = normalizeText(label);
  if (!title) throw new HttpError(400, "Título vazio");
  return prisma.ignoredEventTitle.upsert({
    where: { userId_title: { userId, title } },
    create: { userId, title, label: label.trim() },
    update: {},
    select: { id: true, title: true, label: true, createdAt: true },
  });
}

export async function unignoreEventTitle(userId: string, id: string): Promise<void> {
  // deleteMany com userId no filtro: id de outro usuário vira 404, não exclusão.
  const { count } = await prisma.ignoredEventTitle.deleteMany({ where: { id, userId } });
  if (count === 0) throw new HttpError(404, "Não encontrado");
}
