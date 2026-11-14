// Migra as empresas cadastradas para as rotas: toda empresa com `date` vira
// parada na rota do dia dela (dia do ISO, como no resto do app). Cria a rota do dia quando
// não existe e completa a que já existe, sem duplicar paradas. Empresas sem
// data ficam de fora. Idempotente: rodar de novo não muda nada.
//
//   bun scripts/migrate-companies-to-routes.ts                 # dry-run
//   bun scripts/migrate-companies-to-routes.ts --apply         # grava
//   bun scripts/migrate-companies-to-routes.ts --email x@y.z   # escolhe o usuário
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";
import { formatDate } from "../src/lib/dates";

const apply = process.argv.includes("--apply");
const emailArg = process.argv[process.argv.indexOf("--email") + 1];
const email = process.argv.includes("--email") ? emailArg : process.env.CRON_USER_EMAIL;

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** AAAA-MM-DD pelo ISO (UTC), a mesma regra de `dates.ts` / `companiesOnDay`. */
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

async function resolveUser() {
  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) throw new Error(`Usuário ${email} não encontrado`);
    return user;
  }
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  if (users.length !== 1) throw new Error("Mais de um usuário: informe --email");
  return users[0];
}

async function main() {
  const user = await resolveUser();
  console.log(`${apply ? "APLICANDO" : "DRY-RUN"} · usuário ${user.email}\n`);

  const companies = await prisma.company.findMany({
    where: { date: { not: null } },
    orderBy: [{ date: "asc" }, { name: "asc" }],
    select: { id: true, name: true, address: true, lat: true, lng: true, date: true },
  });

  const byDay = new Map<string, typeof companies>();
  for (const c of companies) {
    const day = dayKey(c.date as Date);
    byDay.set(day, [...(byDay.get(day) ?? []), c]);
  }

  let createdRoutes = 0;
  let createdStops = 0;

  for (const [day, dayCompanies] of byDay) {
    const date = new Date(`${day}T00:00:00.000Z`);
    const route = await prisma.route.findFirst({
      where: { userId: user.id, date },
      orderBy: { createdAt: "asc" },
      include: { stops: { select: { companyId: true, order: true } } },
    });

    const present = new Set(route?.stops.map((s) => s.companyId));
    const missing = dayCompanies.filter((c) => !present.has(c.id));
    if (missing.length === 0) continue;

    let order = Math.max(-1, ...(route?.stops.map((s) => s.order) ?? [])) + 1;
    const stops = missing.map((c) => ({
      companyId: c.id,
      label: c.name,
      address: c.address ?? "",
      lat: c.lat,
      lng: c.lng,
      order: order++,
    }));

    const name = route?.name ?? `Rota do dia ${formatDate(day)}`;
    console.log(`${route ? "+ completa" : "+ cria    "} ${day} "${name}"`);
    for (const s of stops) console.log(`    ${s.label}${s.address ? "" : " (sem endereço)"}`);

    createdStops += stops.length;
    if (!route) createdRoutes++;
    if (!apply) continue;

    if (route) {
      await prisma.stop.createMany({ data: stops.map((s) => ({ ...s, routeId: route.id })) });
    } else {
      await prisma.route.create({
        data: { userId: user.id, name, date, stops: { create: stops } },
      });
    }
  }

  console.log(
    `\n${byDay.size} dias com empresas · ${createdRoutes} rota(s) nova(s) · ${createdStops} parada(s) nova(s)` +
      (apply || createdStops === 0 ? "" : "\nNada gravado. Rode com --apply para aplicar."),
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
  await pool.end();
}
