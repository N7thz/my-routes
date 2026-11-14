import "server-only";
import { prisma } from "@/lib/prisma";
import { trackUsage } from "@/lib/usage";

export type LatLng = { lat: number; lng: number };

/**
 * `not-found`: o serviço respondeu e não conhece o endereço (não adianta
 * insistir até ele mudar). `error`: falha temporária, tenta de novo depois.
 */
export type GeocodeResult = { status: "found"; point: LatLng } | { status: "not-found" } | { status: "error" };

type Provider = {
  name: "geoapify" | "nominatim";
  /** Espaço mínimo entre chamadas, pelo limite do plano de cada serviço. */
  minIntervalMs: number;
  /** Quantos endereços o preenchimento em lote tenta por rodada. */
  backfillLimit: number;
  /** `city`: cidade esperada, quando conhecida, para descartar homônimos. */
  lookup: (query: string, city?: string) => Promise<GeocodeResult>;
};

const TIMEOUT_MS = 8000;

/** Minúsculas e sem acento, para comparar nomes de cidade. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Complementos do formato da Receita que atrapalham o geocodificador. */
const COMPLEMENT =
  /^(PARTE|LOJAS?|SALAS?|SL|BLOCO|BL|APTO?|AP|ANDAR|GALPAO|LOTE|LT|QUADRA|QD|FUNDOS|TERREO|SOBRELOJA|CASA|BOX|KM|S\/N|SN)\b|\bANDAR\b|\bSOBRELOJA\b/i;

/**
 * Buscas a tentar, da mais precisa à mais aproximada. Endereços no formato da
 * Receita ("RUA, 12, LOJA A, BAIRRO, CIDADE/UF, CEP 00000000") não são achados
 * como vêm: separamos cidade, UF e CEP e tiramos os complementos.
 */
export function addressQueries(address: string): { queries: string[]; city?: string } {
  const match = address.match(/^(.*),\s*([^,]+?)\s*\/\s*([A-Z]{2})\s*(?:,\s*CEP\s*([\d.-]+))?\s*$/i);
  if (!match) return { queries: [address] };

  const [, rest, city, uf, cep] = match;
  const parts = rest.split(",").map((p) => p.trim()).filter((p) => p && !COMPLEMENT.test(p));
  const [street, ...others] = parts;
  const number = others.find((p) => /^\d+[A-Z]?$/i.test(p));
  const district = others.filter((p) => p !== number).at(-1);
  const place = `${city}, ${uf}`;
  const digits = cep?.replace(/\D/g, "");

  const queries = [
    [street, number, district, place].filter(Boolean).join(", "),
    [street, number, place].filter(Boolean).join(", "),
    // Último recurso: o CEP leva ao menos à rua ou ao bairro.
    ...(digits?.length === 8 ? [`${digits}, ${place}`] : []),
  ];
  return { queries: [...new Set(queries)], city };
}

function finite(lat: unknown, lng: unknown): GeocodeResult {
  const point = { lat: Number(lat), lng: Number(lng) };
  return Number.isFinite(point.lat) && Number.isFinite(point.lng)
    ? { status: "found", point }
    : { status: "not-found" };
}

/**
 * Área de atuação: todas as empresas ficam no estado do Rio de Janeiro, a
 * maioria em Teresópolis. A busca fica restrita ao estado e, quando o endereço
 * é ambíguo (rua sem cidade, nome repetido), prefere o que está perto de
 * Teresópolis.
 */
const SERVICE_AREA = {
  // Retângulo que cobre o estado do RJ (lng mín, lat mín, lng máx, lat máx).
  rect: { minLng: -44.9, minLat: -23.4, maxLng: -40.9, maxLat: -20.7 },
  stateCode: "RJ",
  // Centro de Teresópolis.
  bias: { lat: -22.4122, lng: -42.9661 },
};

/** Geoapify: base do OpenStreetMap, plano grátis de ~5 req/s e 3.000/dia. */
function geoapifyProvider(key: string): Provider {
  return {
    name: "geoapify",
    minIntervalMs: 220,
    backfillLimit: 60,
    async lookup(query, city) {
      const url = `https://api.geoapify.com/v1/geocode/search?${new URLSearchParams({
        text: query,
        filter: `rect:${SERVICE_AREA.rect.minLng},${SERVICE_AREA.rect.minLat},${SERVICE_AREA.rect.maxLng},${SERVICE_AREA.rect.maxLat}`,
        bias: `proximity:${SERVICE_AREA.bias.lng},${SERVICE_AREA.bias.lat}`,
        lang: "pt",
        limit: "1",
        format: "json",
        apiKey: key,
      })}`;
      // Cada busca gasta 1 crédito da cota diária, achando ou não o endereço.
      void trackUsage("geoapify");
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) {
        console.error("[geocode] Geoapify:", res.status);
        return { status: "error" };
      }
      const data = (await res.json()) as {
        results?: { lat: number; lon: number; city?: string; state_code?: string }[];
      };
      const hit = data.results?.[0];
      if (!hit) return { status: "not-found" };
      // O retângulo pega pontas de MG, SP e ES na divisa.
      if (hit.state_code && hit.state_code !== SERVICE_AREA.stateCode) return { status: "not-found" };
      // Sem achar a rua, o serviço às vezes devolve um lugar homônimo em outra
      // cidade — melhor ficar fora do mapa do que com o ponto errado.
      if (city && hit.city && fold(hit.city) !== fold(city)) return { status: "not-found" };
      return finite(hit.lat, hit.lon);
    },
  };
}

/** Nominatim: grátis e sem chave, mas 1 req/s e fraco em número de rua. */
const nominatimProvider: Provider = {
  name: "nominatim",
  minIntervalMs: 1100,
  backfillLimit: 25,
  async lookup(query) {
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      countrycodes: "br",
      // Só dentro do estado do RJ (lng/lat do canto superior esquerdo e inferior direito).
      viewbox: `${SERVICE_AREA.rect.minLng},${SERVICE_AREA.rect.maxLat},${SERVICE_AREA.rect.maxLng},${SERVICE_AREA.rect.minLat}`,
      bounded: "1",
    })}`;
    // A política do Nominatim pede User-Agent identificando o app.
    const res = await fetch(url, {
      headers: { "User-Agent": "my-routes/1.0", "Accept-Language": "pt-BR" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { status: "error" };
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? finite(hit.lat, hit.lon) : { status: "not-found" };
  },
};

/** Geoapify quando há chave (plano grátis, sem cartão); senão Nominatim. */
function currentProvider(): Provider {
  const geoapify = process.env.GEOAPIFY_API_KEY?.trim();
  if (geoapify) return geoapifyProvider(geoapify);
  return nominatimProvider;
}

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

/** Endereço → coordenadas (Brasil), distinguindo "não existe" de falha temporária. */
export function geocodeLookup(address: string): Promise<GeocodeResult> {
  const query = address.trim();
  if (!query) return Promise.resolve({ status: "not-found" });
  const provider = currentProvider();

  const { queries, city } = addressQueries(query);

  // Fila por processo: chamadas concorrentes saem espaçadas, nunca em rajada.
  const run = queue.then(async (): Promise<GeocodeResult> => {
    for (const q of queries) {
      const wait = provider.minIntervalMs - (Date.now() - lastRequestAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastRequestAt = Date.now();
      let result: GeocodeResult;
      try {
        result = await provider.lookup(q, city);
      } catch {
        result = { status: "error" };
      }
      // Achou, ou o serviço falhou (não adianta gastar as outras tentativas agora).
      if (result.status !== "not-found") return result;
    }
    return { status: "not-found" };
  });
  queue = run.catch(() => {});
  return run;
}

/** Endereço → coordenadas, ou null se não achar ou se o serviço falhar. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const result = await geocodeLookup(address);
  return result.status === "found" ? result.point : null;
}

/**
 * Geocodifica a empresa e repassa as coordenadas às paradas dela que ainda
 * não têm (as paradas copiam o endereço da empresa na criação).
 */
export async function geocodeCompany(companyId: string): Promise<GeocodeResult["status"]> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { address: true },
  });
  if (!company?.address) return "not-found";

  const result = await geocodeLookup(company.address);
  if (result.status === "not-found") {
    await prisma.company.update({ where: { id: companyId }, data: { geocodeFailedAt: new Date() } });
  }
  if (result.status !== "found") return result.status;

  await prisma.$transaction([
    prisma.company.update({
      where: { id: companyId },
      data: { ...result.point, geocodeFailedAt: null },
    }),
    prisma.stop.updateMany({
      where: { companyId, lat: null, address: company.address },
      data: { ...result.point, geocodeFailedAt: null },
    }),
  ]);
  return "found";
}

export async function geocodeStop(stopId: string): Promise<GeocodeResult["status"]> {
  const stop = await prisma.stop.findUnique({ where: { id: stopId }, select: { address: true } });
  if (!stop?.address) return "not-found";
  const result = await geocodeLookup(stop.address);
  if (result.status === "error") return "error";
  await prisma.stop.update({
    where: { id: stopId },
    data: result.status === "found" ? { ...result.point, geocodeFailedAt: null } : { geocodeFailedAt: new Date() },
  });
  return result.status;
}

/**
 * Coordenadas das paradas recém-criadas pela sincronização (que entram em lote,
 * sem passar pela geocodificação da criação manual). Geocodifica primeiro as
 * empresas delas, o que já repassa o ponto às paradas com o mesmo endereço, e
 * depois as paradas que sobrarem. Feita para rodar em `after()`.
 */
export async function geocodeNewStops(stopIds: string[]): Promise<void> {
  if (stopIds.length === 0) return;
  const pending = { id: { in: stopIds }, lat: null, geocodeFailedAt: null };

  const companies = await prisma.company.findMany({
    where: { stops: { some: pending }, lat: null, geocodeFailedAt: null, address: { not: null } },
    select: { id: true },
  });
  for (const { id } of companies) {
    if ((await geocodeCompany(id)) === "error") return;
  }

  const stops = await prisma.stop.findMany({ where: { ...pending, NOT: { address: "" } }, select: { id: true } });
  for (const { id } of stops) {
    if ((await geocodeStop(id)) === "error") return;
  }
}

export type GeocodeBackfillResult ={ companies: number; stops: number; notFound: number; errors: number };

/**
 * Preenche coordenadas que faltam (empresas importadas do Notion, paradas
 * antigas). Limitado por rodada pelo ritmo do serviço: 25 no Nominatim (1 req/s),
 * mais na Geoapify.
 */
export async function backfillCoordinates(limit = currentProvider().backfillLimit): Promise<GeocodeBackfillResult> {
  const result: GeocodeBackfillResult = { companies: 0, stops: 0, notFound: 0, errors: 0 };
  const tally = (status: GeocodeResult["status"], ok: "companies" | "stops") => {
    if (status === "found") result[ok]++;
    else if (status === "not-found") result.notFound++;
    else result.errors++;
  };

  const companies = await prisma.company.findMany({
    // Quem já falhou por "não encontrado" só volta à fila se o endereço mudar.
    where: { lat: null, address: { not: null }, geocodeFailedAt: null },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  for (const { id } of companies) tally(await geocodeCompany(id), "companies");

  const remaining = limit - companies.length;
  if (remaining > 0) {
    const stops = await prisma.stop.findMany({
      where: { lat: null, geocodeFailedAt: null, NOT: { address: "" } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: remaining,
    });
    for (const { id } of stops) tally(await geocodeStop(id), "stops");
  }

  return result;
}
