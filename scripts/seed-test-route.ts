import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";
const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── paradas da rota fictícia ──────────────────────────────────────────────────
const STOPS = [
  {
    label: "Ponto de partida – Prefeitura Municipal",
    address: "Av. Feliciano Sodré, 675 - Centro, Teresópolis - RJ, 25953-062",
    companyName: null,
  },
  {
    label: "OPUS Contabilidade",
    address: "Rua Duque de Caxias, 55 - Alto, Teresópolis - RJ, 25960-000",
    companyName: "OPUS CONTABILIDADE LTDA",
  },
  {
    label: "Lavoro Pães Artesanais",
    address: "Rua Sebastião Teixeira, 210 - Várzea, Teresópolis - RJ, 25955-000",
    companyName: "LAVORO PAES ARTESANAIS LTDA",
  },
  {
    label: "Eletromec Teresópolis",
    address: "Av. Tenente Luiz Meireles, 482 - Várzea, Teresópolis - RJ, 25953-100",
    companyName: "ELETROMEC DE TERESOPOLIS ELETROMECANICA LTDA",
  },
  {
    label: "Recanto dos Sucos",
    address: "Rua Delfim Moreira, 170 - São Pedro, Teresópolis - RJ, 25964-000",
    companyName: "RECANTO DOS SUCOS 170 RESTAURANTE LTDA",
  },
  {
    label: "Parque Nacional da Serra dos Órgãos",
    address: "Av. Rotariana, s/n - Soberbo, Teresópolis - RJ, 25960-602",
    companyName: null,
  },
];

async function main() {
  // pega o primeiro usuário cadastrado
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    console.error("Nenhum usuário encontrado. Faça login primeiro.");
    process.exit(1);
  }
  console.log(`Usando usuário: ${user.email}`);

  // verifica se a rota de teste já existe
  const existing = await prisma.route.findFirst({
    where: { userId: user.id, name: "Rota de Teste – Teresópolis" },
  });
  if (existing) {
    console.log("Rota de teste já existe, pulando.");
    await pool.end();
    return;
  }

  // cria a rota
  const route = await prisma.route.create({
    data: {
      userId: user.id,
      name: "Rota de Teste – Teresópolis",
      date: new Date("2026-06-25"),
      status: "RASCUNHO",
    },
  });
  console.log(`Rota criada: ${route.id}`);

  // resolve IDs das empresas pelo nome
  const companyNames = STOPS.map((s) => s.companyName).filter(Boolean) as string[];
  const companies = await prisma.company.findMany({
    where: { name: { in: companyNames } },
    select: { id: true, name: true },
  });
  const companyMap = new Map(companies.map((c) => [c.name, c.id]));

  // cria as paradas
  for (let i = 0; i < STOPS.length; i++) {
    const s = STOPS[i];
    const companyId = s.companyName ? (companyMap.get(s.companyName) ?? null) : null;
    await prisma.stop.create({
      data: {
        routeId: route.id,
        companyId,
        label: s.label,
        address: s.address,
        order: i,
      },
    });
    console.log(`  [${i + 1}] ${s.label}`);
  }

  console.log("\nRota de teste criada com sucesso.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
