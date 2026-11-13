// Ordem otimizada das paradas de uma rota. O solver é puro (testável com
// `bun test`); a matriz de custos vem do OSRM público (tempo de carro) e, se ele
// falhar, da distância em linha reta.

export type Point = { lat: number; lng: number };

/** Distância em linha reta (km) entre dois pontos. */
export function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function haversineMatrix(points: Point[]): number[][] {
  return points.map((a) => points.map((b) => haversineKm(a, b)));
}

/** Custo do percurso `path` (índices da matriz), opcionalmente voltando ao início. */
export function pathCost(matrix: number[][], path: number[], roundTrip = false): number {
  let cost = 0;
  for (let i = 1; i < path.length; i++) cost += matrix[path[i - 1]][path[i]];
  if (roundTrip && path.length > 1) cost += matrix[path[path.length - 1]][path[0]];
  return cost;
}

/**
 * Melhor ordem de visita dos índices 1..n-1 da matriz. Com `fixedStart`, o
 * índice 0 é o ponto de saída (não entra na resposta) e, com `roundTrip`, também
 * o de chegada. Sem ponto de saída, todos os índices são paradas e qualquer um
 * pode abrir o percurso.
 *
 * Vizinho mais próximo (de cada início possível) seguido de 2-opt: ótimo na
 * prática para as poucas dezenas de paradas de um dia.
 */
export function solveOrder(
  matrix: number[][],
  { fixedStart, roundTrip = false }: { fixedStart: boolean; roundTrip?: boolean }
): number[] {
  const n = matrix.length;
  if (n === 0) return [];
  const stops = fixedStart ? range(1, n) : range(0, n);
  if (stops.length <= 1) return stops;

  const starts = fixedStart ? [0] : stops;
  const closeLoop = fixedStart && roundTrip;

  let best: number[] = [];
  let bestCost = Infinity;
  for (const start of starts) {
    const path = twoOpt(matrix, nearestNeighbor(matrix, start, stops), fixedStart, closeLoop);
    const cost = pathCost(matrix, path, closeLoop);
    if (cost < bestCost) {
      bestCost = cost;
      best = path;
    }
  }
  return fixedStart ? best.slice(1) : best;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from }, (_, i) => from + i);
}

function nearestNeighbor(matrix: number[][], start: number, stops: number[]): number[] {
  const left = new Set(stops.filter((s) => s !== start));
  const path = [start];
  while (left.size > 0) {
    const last = path[path.length - 1];
    let next = -1;
    for (const s of left) if (next === -1 || matrix[last][s] < matrix[last][next]) next = s;
    path.push(next);
    left.delete(next);
  }
  return path;
}

/** Inverte trechos enquanto isso baixar o custo. O primeiro nó fica fixo quando `keepFirst`. */
function twoOpt(matrix: number[][], initial: number[], keepFirst: boolean, roundTrip: boolean): number[] {
  let path = initial;
  let cost = pathCost(matrix, path, roundTrip);
  const from = keepFirst ? 1 : 0;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = from; i < path.length - 1; i++) {
      for (let j = i + 1; j < path.length; j++) {
        const candidate = [...path.slice(0, i), ...path.slice(i, j + 1).reverse(), ...path.slice(j + 1)];
        const candidateCost = pathCost(matrix, candidate, roundTrip);
        if (candidateCost < cost - 1e-9) {
          path = candidate;
          cost = candidateCost;
          improved = true;
        }
      }
    }
  }
  return path;
}

const OSRM_TABLE_URL = "https://router.project-osrm.org/table/v1/driving";
/** O servidor público do OSRM recusa tabelas muito grandes. */
const OSRM_MAX_POINTS = 90;

/** Matriz de tempos de carro (s) entre os pontos, ou null se o OSRM falhar. */
export async function osrmDurationMatrix(points: Point[]): Promise<number[][] | null> {
  if (points.length < 2 || points.length > OSRM_MAX_POINTS) return null;
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  try {
    const res = await fetch(`${OSRM_TABLE_URL}/${coords}?annotations=duration`, {
      headers: { "User-Agent": "my-routes/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { code?: string; durations?: (number | null)[][] };
    if (data.code !== "Ok" || !data.durations) return null;
    // Par sem rota (ilha, ponto fora da malha): custo alto em vez de quebrar.
    return data.durations.map((row) => row.map((d) => (d == null ? 1e9 : d)));
  } catch {
    return null;
  }
}

/**
 * Ordena `items` (que têm coordenadas) pelo melhor percurso, saindo de `origin`
 * quando informado (e voltando a ele no fim do dia).
 */
export async function optimizeOrder<T extends Point>(
  items: T[],
  origin?: Point | null
): Promise<{ ordered: T[]; source: "osrm" | "haversine" }> {
  if (items.length <= 1) return { ordered: items, source: "haversine" };
  const points: Point[] = origin ? [origin, ...items] : items;
  const osrm = await osrmDurationMatrix(points);
  const matrix = osrm ?? haversineMatrix(points);
  const order = solveOrder(matrix, { fixedStart: !!origin, roundTrip: !!origin });
  const offset = origin ? 1 : 0;
  return { ordered: order.map((i) => items[i - offset]), source: osrm ? "osrm" : "haversine" };
}
