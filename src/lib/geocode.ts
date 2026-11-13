import "server-only";
import { prisma } from "@/lib/prisma";

export type LatLng = { lat: number; lng: number };

/**
 * `not-found`: o serviço respondeu e não conhece o endereço (não adianta
 * insistir até ele mudar). `error`: falha temporária, tenta de novo depois.
 */
export type GeocodeResult = { status: "found"; point: LatLng } | { status: "not-found" } | { status: "error" };

// Política do Nominatim: no máximo 1 requisição/s e User-Agent identificando o app.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_INTERVAL_MS = 1100;

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

/** Endereço → coordenadas (Brasil), distinguindo "não existe" de falha temporária. */
export function geocodeLookup(address: string): Promise<GeocodeResult> {
  const query = address.trim();
  if (!query) return Promise.resolve({ status: "not-found" });

  // Fila por processo: chamadas concorrentes saem espaçadas, nunca em rajada.
  const run = queue.then(async (): Promise<GeocodeResult> => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();

    try {
      const url = `${NOMINATIM_URL}?${new URLSearchParams({
        q: query,
        format: "json",
        limit: "1",
        countrycodes: "br",
      })}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "my-routes/1.0", "Accept-Language": "pt-BR" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { status: "error" };
      const [hit] = (await res.json()) as { lat: string; lon: string }[];
      if (!hit) return { status: "not-found" };
      const point = { lat: Number(hit.lat), lng: Number(hit.lon) };
      return Number.isFinite(point.lat) && Number.isFinite(point.lng)
        ? { status: "found", point }
        : { status: "not-found" };
    } catch {
      return { status: "error" };
    }
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
    data:
      result.status === "found"
        ? { ...result.point, geocodeFailedAt: null }
        : { geocodeFailedAt: new Date() },
  });
  return result.status;
}

export type GeocodeBackfillResult = { companies: number; stops: number; notFound: number; errors: number };

/**
 * Preenche coordenadas que faltam (empresas importadas do Notion, paradas
 * antigas). Limitado por rodada porque o Nominatim aceita 1 req/s.
 */
export async function backfillCoordinates(limit = 25): Promise<GeocodeBackfillResult> {
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
