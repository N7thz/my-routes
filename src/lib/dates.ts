/**
 * Datas "só dia" (`Company.date`, `Route.date`) são gravadas à meia-noite UTC e
 * trafegam como ISO. A chave do dia (YYYY-MM-DD) é sempre obtida fatiando o
 * ISO — converter para o fuso local antes deslocaria o dia.
 */

/** Hoje como YYYY-MM-DD, no fuso informado (padrão: o do ambiente). */
export function todayKey(timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** Mês atual como YYYY-MM, no fuso do ambiente. */
export function currentMonthKey(): string {
  return todayKey().slice(0, 7);
}

export function dayKey(date: Date | string | null): string | null {
  if (!date) return null;
  return (typeof date === "string" ? date : date.toISOString()).slice(0, 10);
}

/** Meio-dia local do dia da chave — longe das bordas de fuso. */
export function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function nextDayKey(key: string): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Intervalo [00:00, 24:00) UTC do dia, para consultar colunas "só dia". */
export function dayRange(key: string): { start: Date; end: Date } {
  return {
    start: new Date(`${key}T00:00:00.000Z`),
    end: new Date(`${nextDayKey(key)}T00:00:00.000Z`),
  };
}

/** "26 de jul. de 2026" (ou "26 de jul." com `year: false`); "—" quando vazio. */
export function formatDate(
  value: Date | string | null | undefined,
  { year = true }: { year?: boolean } = {}
): string {
  if (!value) return "—";
  const date =
    typeof value === "string" && value.length === 10 ? dateFromKey(value) : new Date(value);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(year && { year: "numeric" }),
  });
}
