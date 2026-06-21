import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --force para sobrescrever endereços já preenchidos
const FORCE = process.argv.includes("--force");
// --dry-run para apenas mostrar o que seria feito
const DRY_RUN = process.argv.includes("--dry-run");

type BrasilApiResponse = {
  razao_social: string;
  nome_fantasia?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  descricao_situacao_cadastral?: string;
  situacao_cadastral?: string;
};

async function fetchReceita(cnpj: string): Promise<BrasilApiResponse | null> {
  const digits = cnpj.replace(/\D/g, "");
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as BrasilApiResponse;
  } catch (err) {
    throw err;
  }
}

function buildAddress(d: BrasilApiResponse): string {
  return [
    d.logradouro,
    d.numero,
    d.complemento,
    d.bairro,
    d.municipio && d.uf ? `${d.municipio}/${d.uf}` : d.municipio ?? d.uf,
    d.cep ? `CEP ${d.cep}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const companies = await prisma.company.findMany({
    where: { cnpj: { not: null } },
    orderBy: { name: "asc" },
  });

  const toProcess = FORCE
    ? companies
    : companies.filter((c) => !c.address);

  console.log(`\nEmpresas com CNPJ: ${companies.length}`);
  console.log(`Sem endereço${FORCE ? " (--force: todas)" : ""}: ${toProcess.length}`);
  if (DRY_RUN) console.log("Modo: DRY-RUN (nenhuma alteração será salva)\n");
  else console.log("");

  if (toProcess.length === 0) {
    console.log("Nada a fazer.");
    await pool.end();
    return;
  }

  let updated = 0;
  let notFound = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const company = toProcess[i];
    const prefix = `[${String(i + 1).padStart(2, " ")}/${toProcess.length}]`;

    process.stdout.write(`${prefix} ${company.name.slice(0, 50).padEnd(50)} `);

    try {
      const data = await fetchReceita(company.cnpj!);

      if (!data) {
        console.log("não encontrado");
        notFound++;
      } else {
        const address = buildAddress(data);
        const situacao = data.descricao_situacao_cadastral ?? data.situacao_cadastral ?? "";

        if (!DRY_RUN) {
          await prisma.company.update({
            where: { id: company.id },
            data: { address: address || null },
          });
        }

        console.log(`OK  ${situacao}  →  ${address.slice(0, 60)}`);
        updated++;
      }
    } catch (err) {
      console.log(`ERRO: ${(err as Error).message}`);
      errors++;
    }

    // Respeita o rate limit da BrasilAPI (~3 req/s)
    if (i < toProcess.length - 1) await sleep(400);
  }

  console.log("\n─────────────────────────────────────────");
  console.log(`Atualizadas : ${updated}`);
  console.log(`Não achadas : ${notFound}`);
  console.log(`Erros       : ${errors}`);
  if (skipped) console.log(`Puladas     : ${skipped}`);
  console.log("─────────────────────────────────────────");

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
