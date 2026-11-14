import type { RouteStatus } from "../../prisma/generated/enums";

/**
 * Status que a rota assume pelas paradas visitadas: todas visitadas → CONCLUIDA;
 * alguma visitada → EM_ANDAMENTO; nenhuma visitada → mantém o atual, exceto
 * CONCLUIDA, que volta a RASCUNHO. Sem paradas, mantém o atual.
 *
 * Usada no servidor (depois de marcar, incluir ou remover parada) e no update
 * otimista do cliente, para os dois concordarem.
 */
export function statusFromStops(
  current: RouteStatus,
  stops: { visitedAt: Date | string | null }[],
): RouteStatus {
  if (stops.length === 0) return current;
  const visited = stops.filter((s) => s.visitedAt).length;
  if (visited === stops.length) return "CONCLUIDA";
  if (visited > 0) return "EM_ANDAMENTO";
  return current === "CONCLUIDA" ? "RASCUNHO" : current;
}
