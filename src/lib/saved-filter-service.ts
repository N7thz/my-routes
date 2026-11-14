import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { SavedFilterScreen } from "@/lib/schemas";

export type SavedFilterRecord = {
  id: string;
  screen: string;
  name: string;
  query: string;
  createdAt: Date;
};

const select = { id: true, screen: true, name: true, query: true, createdAt: true } as const;

export async function listSavedFilters(screen: SavedFilterScreen): Promise<SavedFilterRecord[]> {
  const userId = await requireUserId();
  return prisma.savedFilter.findMany({
    where: { userId, screen },
    orderBy: { name: "asc" },
    select,
  });
}

/** Salva os filtros com o nome dado; se o nome já existe na tela, substitui. */
export async function saveFilter(data: {
  screen: SavedFilterScreen;
  name: string;
  query: string;
}): Promise<SavedFilterRecord> {
  const userId = await requireUserId();
  return prisma.savedFilter.upsert({
    where: { userId_screen_name: { userId, screen: data.screen, name: data.name } },
    create: { userId, ...data },
    update: { query: data.query },
    select,
  });
}

export async function deleteSavedFilter(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.savedFilter.delete({ where: { id, userId } });
}
