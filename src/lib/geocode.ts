import "server-only";
import { prisma } from "@/lib/prisma";

export type LatLng = { lat: number; lng: number };

// Política do Nominatim: no máximo 1 requisição/s e User-Agent identificando o app.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_INTERVAL_MS = 1100;

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

/** Endereço → coordenadas (Brasil). null se não achar ou se o serviço falhar. */
export function geocodeAddress(address: string): Promise<LatLng | null> {
  const query = address.trim();
  if (!query) return Promise.resolve(null);

  // Fila por processo: chamadas concorrentes saem espaçadas, nunca em rajada.
  const run = queue.then(async () => {
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
      if (!res.ok) return null;
      const [hit] = (await res.json()) as { lat: string; lon: string }[];
      if (!hit) return null;
      const point = { lat: Number(hit.lat), lng: Number(hit.lon) };
      return Number.isFinite(point.lat) && Number.isFinite(point.lng) ? point : null;
    } catch {
      return null;
    }
  });
  queue = run.catch(() => {});
  return run;
}

/**
 * Geocodifica a empresa e repassa as coordenadas às paradas dela que ainda
 * não têm (as paradas copiam o endereço da empresa na criação).
 */
export async function geocodeCompany(companyId: string): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { address: true },
  });
  if (!company?.address) return false;

  const point = await geocodeAddress(company.address);
  if (!point) return false;

  await prisma.$transaction([
    prisma.company.update({ where: { id: companyId }, data: point }),
    prisma.stop.updateMany({
      where: { companyId, lat: null, address: company.address },
      data: point,
    }),
  ]);
  return true;
}

export async function geocodeStop(stopId: string): Promise<boolean> {
  const stop = await prisma.stop.findUnique({ where: { id: stopId }, select: { address: true } });
  if (!stop?.address) return false;
  const point = await geocodeAddress(stop.address);
  if (!point) return false;
  await prisma.stop.update({ where: { id: stopId }, data: point });
  return true;
}

export type GeocodeBackfillResult = { companies: number; stops: number; failed: number };

/**
 * Preenche coordenadas que faltam (empresas importadas do Notion, paradas
 * antigas). Limitado por rodada porque o Nominatim aceita 1 req/s.
 */
export async function backfillCoordinates(limit = 25): Promise<GeocodeBackfillResult> {
  const result: GeocodeBackfillResult = { companies: 0, stops: 0, failed: 0 };

  const companies = await prisma.company.findMany({
    where: { lat: null, address: { not: null } },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  for (const { id } of companies) {
    if (await geocodeCompany(id)) result.companies++;
    else result.failed++;
  }

  const remaining = limit - companies.length;
  if (remaining > 0) {
    const stops = await prisma.stop.findMany({
      where: { lat: null, NOT: { address: "" } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: remaining,
    });
    for (const { id } of stops) {
      if (await geocodeStop(id)) result.stops++;
      else result.failed++;
    }
  }

  return result;
}
