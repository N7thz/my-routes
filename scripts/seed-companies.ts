import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";
import type { CompanyStatus } from "../prisma/generated/enums";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const STATUS_MAP: Record<string, CompanyStatus> = {
  "Concluído": "CONCLUIDO",
  "Pendente": "PENDENTE",
  "Em Andamento": "EM_ANDAMENTO",
  "Revisão": "REVISAO",
};

const MONTH_MAP: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3,
  maio: 4, junho: 5, julho: 6, agosto: 7,
  setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

function parseDate(str: string): Date | null {
  const m = str.trim().match(/^(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})$/i);
  if (!m) return null;
  const month = MONTH_MAP[m[2].toLowerCase()];
  if (month === undefined) return null;
  return new Date(parseInt(m[3]), month, parseInt(m[1]));
}

const companies: {
  name: string;
  cnpj: string | null;
  date: string;
  observations: string | null;
  status: string;
}[] = [
  { name: "CADEL MATERIAIS ELETRICOS HIDRAULICOS E FERRAGENS LTDA", cnpj: "27.127.786/0001-69", date: "10 de março de 2026", observations: null, status: "Concluído" },
  { name: "SUPER SALSA RESTAURANTE E MERCEARIA LTDA", cnpj: "56.503.880/0001-73", date: "17 de março de 2026", observations: null, status: "Concluído" },
  { name: "ACAI NO PONTO DE TERESOPOLIS LTDA", cnpj: "65.346.857/0001-03", date: "17 de março de 2026", observations: "FAZER TAMBEM RELATORIO DE NÃO CONFORMIDADE", status: "Concluído" },
  { name: "RESTAURANTE PARAISO DA SERRA AGRIOES LTDA", cnpj: "10.653.744/0001-69", date: "18 de março de 2026", observations: null, status: "Concluído" },
  { name: "SALSA BRASILEIRA RESTAURANTE", cnpj: "46.282.636/0001-74", date: "19 de março de 2026", observations: null, status: "Concluído" },
  { name: "NINE PIZZA EXPRESS RESTAURANTE LTDA", cnpj: "30.773.624/0001-02", date: "19 de março de 2026", observations: null, status: "Concluído" },
  { name: "OPUS CONTABILIDADE LTDA", cnpj: "27.585.323/0001-40", date: "23 de março de 2026", observations: null, status: "Concluído" },
  { name: "LAVORO PAES ARTESANAIS LTDA", cnpj: "32.286.829/0001-99", date: "24 de março de 2026", observations: null, status: "Concluído" },
  { name: "ELETROMEC DE TERESOPOLIS ELETROMECANICA LTDA", cnpj: "00.779.979/0001-48", date: "24 de março de 2026", observations: "RELATORIO DE NÃO CONFORMIDADE", status: "Concluído" },
  { name: "PEDREIRA VILA REAL LTDA", cnpj: null, date: "30 de março de 2026", observations: null, status: "Concluído" },
  { name: "RECANTO DOS SUCOS 170 RESTAURANTE LTDA", cnpj: "17.347.080/0001-59", date: "30 de março de 2026", observations: null, status: "Concluído" },
  { name: "CENTRO DIAGNOSTICO E TERAPEUTICO", cnpj: "00.918.803/0002-00", date: "12 de março de 2026", observations: null, status: "Concluído" },
  { name: "CENTRO DIAGNOSTICO E TERAPEUTICO LTDA", cnpj: "00.918.803/0003-91", date: "12 de março de 2026", observations: null, status: "Concluído" },
  { name: "DECORAMOVEIS LTDA", cnpj: "32.192.767/0001-56", date: "2 de abril de 2026", observations: null, status: "Concluído" },
  { name: "ETHEL MOVEIS LTDA", cnpj: "32.176.067/0001-78", date: "2 de abril de 2026", observations: null, status: "Concluído" },
  { name: "MERCADO DOS MOVEIS SAO PEDRO DE TERESOPOLIS LTDA", cnpj: "28.597.292/0001-00", date: "2 de abril de 2026", observations: null, status: "Concluído" },
  { name: "GALPAO DE TERESOPOLIS MOVEIS", cnpj: "28.975.282/0001-61", date: "2 de abril de 2026", observations: null, status: "Concluído" },
  { name: "ESPACO HOLISTICO VERDE NOVO LTDA", cnpj: "38.131.604/0001-40", date: "6 de abril de 2026", observations: null, status: "Concluído" },
  { name: "INGRID ALMEIDA CUNHA FERREIRA", cnpj: "54.485.005/0001-80", date: "6 de abril de 2026", observations: null, status: "Concluído" },
  { name: "ASL SOFTHOUSE LTDA", cnpj: "10.606.378/0001-97", date: "8 de abril de 2026", observations: null, status: "Concluído" },
  { name: "SPE HILDEGARDO 906 EMPREENDIMENTOS IMOBILIARIOS LTDA", cnpj: "54.991.157/0001-55", date: "13 de abril de 2026", observations: null, status: "Concluído" },
  { name: "AUTO PECAS IRMAOS VIEIRA DE TERESOPOLIS LTDA", cnpj: "02.657.672/0001-08", date: "20 de abril de 2026", observations: null, status: "Concluído" },
  { name: "PIZZARIA AGRIOES LTDA", cnpj: "33.827.076/0001-44", date: "18 de março de 2026", observations: null, status: "Concluído" },
  { name: "SOUZA E LEITE COMERCIO DE MATERIAIS DE CONSTRUCAO LTDA ME", cnpj: "10.512.007/0001-46", date: "17 de abril de 2026", observations: null, status: "Concluído" },
  { name: "PSICO PILLER", cnpj: null, date: "16 de abril de 2026", observations: null, status: "Concluído" },
  { name: "AF FARO SERVICOS AGRIMENSURA LTDA", cnpj: null, date: "27 de abril de 2026", observations: null, status: "Concluído" },
  { name: "ALL SERVICES MANUTENCAO EM EQUIPAMENTOS DE INFORMATICA LTDA", cnpj: "13.323.808/0001-51", date: "28 de abril de 2026", observations: null, status: "Concluído" },
  { name: "CENTRAL TERE LTDA", cnpj: "40.064.633/0001-88", date: "25 de maio de 2026", observations: null, status: "Concluído" },
  { name: "MAD BREW TAP HOUSE LTDA", cnpj: "31.396.982/0001-06", date: "1 de junho de 2026", observations: null, status: "Concluído" },
  { name: "CCN - COMERCIAL CENTRO NORTE ALIMENTOS LTDA", cnpj: "08.638.790/0001-47", date: "27 de maio de 2026", observations: null, status: "Concluído" },
  { name: "VISAO NF LOGISTICA E PARTICIPACOES LTDA", cnpj: "08.818.770/0001-58", date: "27 de maio de 2026", observations: null, status: "Concluído" },
  { name: "COMARY INDUSTRIA DE BEBIDAS LTDA", cnpj: "29.588.019/0001-82", date: "20 de maio de 2026", observations: null, status: "Pendente" },
  { name: "MERCADO UNIAO DA SERRA LTDA", cnpj: "53.215.433/0003-92", date: "1 de junho de 2026", observations: null, status: "Concluído" },
  { name: "POSTO STo ESTEVAO LTDA", cnpj: "36.642.879/0001-12", date: "2 de junho de 2026", observations: null, status: "Concluído" },
  { name: "RFC BAR E GASTRONOMIA LTDA", cnpj: "52.557.528/0001-60", date: "1 de junho de 2026", observations: null, status: "Concluído" },
  { name: "MAD SUSHI LTDA", cnpj: "34.703.211/0001-02", date: "2 de junho de 2026", observations: null, status: "Concluído" },
  { name: "MAD VENDAS E LICENCIAMENTOS DE FRANQUIAS LTDA", cnpj: "51.826.622/0001-04", date: "2 de junho de 2026", observations: null, status: "Concluído" },
  { name: "GDN GASTRONOMIA LTDA", cnpj: "52.605.062/0001-20", date: "2 de junho de 2026", observations: null, status: "Concluído" },
  { name: "PIZZA DO SEU JEITO LTDA", cnpj: "66.330.170/0001-42", date: "3 de junho de 2026", observations: null, status: "Concluído" },
  { name: "ARTE SERRA CONFECCOES LTDA", cnpj: "37.647.232/0001-46", date: "5 de junho de 2026", observations: null, status: "Concluído" },
  { name: "KINSHU GASTRONOMIA LTDA", cnpj: "41.798.754/0001-16", date: "8 de junho de 2026", observations: null, status: "Concluído" },
  { name: "KINSHU SUSHI DELIVERY LTDA", cnpj: "32.076.198/0001-83", date: "8 de junho de 2026", observations: null, status: "Concluído" },
  { name: "CANTINHO DOS BICHINHOS LTDA", cnpj: "48.793.162/0001-50", date: "12 de junho de 2026", observations: null, status: "Concluído" },
  { name: "A.C. HONORATO INFORMATICA LTDA", cnpj: "09.006.807/0001-06", date: "15 de junho de 2026", observations: null, status: "Concluído" },
  { name: "FEO ODONTOLOGIA LTDA", cnpj: "32.190.155/0001-24", date: "15 de junho de 2026", observations: null, status: "Concluído" },
  { name: "CONSTRUTORA MAUAD LTDA", cnpj: "04.102.801/0001-19", date: "17 de junho de 2026", observations: null, status: "Pendente" },
  { name: "CONDOMINIO DO EDIFICIO IPE", cnpj: "03.799.600/0001-50", date: "18 de junho de 2026", observations: null, status: "Pendente" },
  { name: "CONDOMINIO DO EDIFICIO BEL CINTIA", cnpj: "00.373.583/0001-04", date: "18 de junho de 2026", observations: null, status: "Concluído" },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const row of companies) {
    const existing = await prisma.company.findFirst({
      where: { name: row.name },
    });

    if (existing) {
      console.log(`  skip  ${row.name}`);
      skipped++;
      continue;
    }

    const date = parseDate(row.date);
    const status = STATUS_MAP[row.status] ?? null;

    await prisma.company.create({
      data: {
        name: row.name,
        cnpj: row.cnpj,
        date,
        observations: row.observations,
        status,
      },
    });

    console.log(`  ok    ${row.name}`);
    created++;
  }

  console.log(`\nTotal: ${created} criadas, ${skipped} já existiam.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
