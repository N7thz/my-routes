import "server-only";
import { prisma } from "@/lib/prisma";

/** Ferramentas com plano/cota cujo uso o app conta sozinho. */
export type UsageService = "geoapify" | "maptiler";

const todayUtc = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

/**
 * Soma `amount` ao contador de hoje (UTC) do serviço. Nunca lança: perder uma
 * contagem é melhor do que derrubar a chamada que está sendo medida.
 */
export async function trackUsage(service: UsageService, amount = 1): Promise<void> {
  const day = todayUtc();
  try {
    await prisma.apiUsage.upsert({
      where: { service_day: { service, day } },
      create: { service, day, count: amount },
      update: { count: { increment: amount } },
    });
  } catch (err) {
    console.warn("[usage]", service, err instanceof Error ? err.message : err);
  }
}

export type UsageWindow = { today: number; month: number; daily: { day: string; count: number }[] };

/** Uso de hoje, do mês corrente (UTC) e dos últimos 30 dias, por serviço. */
export async function usageByService(): Promise<Record<UsageService, UsageWindow>> {
  const today = todayUtc();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - 29);
  const from = since < monthStart ? since : monthStart;

  const rows = await prisma.apiUsage.findMany({
    where: { day: { gte: from } },
    orderBy: { day: "asc" },
  });

  const result: Record<UsageService, UsageWindow> = {
    geoapify: { today: 0, month: 0, daily: [] },
    maptiler: { today: 0, month: 0, daily: [] },
  };
  for (const row of rows) {
    const bucket = result[row.service as UsageService];
    if (!bucket) continue;
    const t = row.day.getTime();
    if (t === today.getTime()) bucket.today += row.count;
    if (t >= monthStart.getTime()) bucket.month += row.count;
    if (t >= since.getTime()) bucket.daily.push({ day: row.day.toISOString().slice(0, 10), count: row.count });
  }
  return result;
}

/** Tamanho do banco atual em bytes (conta para o limite de storage do Neon). */
export async function databaseSizeBytes(): Promise<number> {
  const [row] = await prisma.$queryRaw<{ size: bigint }[]>`SELECT pg_database_size(current_database()) AS size`;
  return Number(row?.size ?? 0);
}
