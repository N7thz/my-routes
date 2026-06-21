import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const companies = [
  { name: "KINSHU GASTRONOMIA LTDA",                                     cnpj: "41.798.754/0001-16", status: "CONCLUIDO" as const, date: new Date("2026-06-08"), notionId: "37af6788-631d-80f8-b71e-fe5d02fba5e9" },
  { name: "A.C. HONORATO INFORMATICA LTDA",                              cnpj: "09.006.807/0001-06", status: "CONCLUIDO" as const, date: new Date("2026-06-15"), notionId: "380f6788-631d-8038-9939-d702c7013bf3" },
  { name: "ALL SERVICES MANUTENCAO EM EQUIPAMENTOS DE INFORMATICA LTDA", cnpj: "13.323.808/0001-51", status: "CONCLUIDO" as const, date: new Date("2026-04-28"), notionId: "351f6788-631d-805b-9d38-e7623cef04e6" },
  { name: "CONDOMINIO DO EDIFICIO IPE",                                  cnpj: "03.799.600/0001-50", status: "PENDENTE"  as const, date: new Date("2026-06-18"), notionId: "383f6788-631d-80ca-8f91-c37e4bc99cc8" },
  { name: "CONSTRUTORA MAUAD LTDA",                                      cnpj: "04.102.801/0001-19", status: "PENDENTE"  as const, date: new Date("2026-06-17"), notionId: "383f6788-631d-8028-8988-f0fddebba1f0" },
  { name: "COMARY INDUSTRIA DE BEBIDAS LTDA",                            cnpj: "29.588.019/0001-82", status: "PENDENTE"  as const, date: new Date("2026-05-20"), notionId: "373f6788-631d-807e-99af-f00a016996fc" },
  { name: "GDN GASTRONOMIA LTDA",                                        cnpj: "52.605.062/0001-20", status: "CONCLUIDO" as const, date: new Date("2026-06-02"), notionId: "373f6788-631d-8015-ba23-d83a21edfcc5" },
  { name: "CONDOMINIO DO EDIFICIO BEL CINTIA",                           cnpj: "00.373.583/0001-04", status: "PENDENTE"  as const, date: new Date("2026-06-18"), notionId: "383f6788-631d-8050-b0f3-ee0e492639af" },
  { name: "RFC BAR E GASTRONOMIA LTDA",                                  cnpj: "52.557.528/0001-60", status: "CONCLUIDO" as const, date: new Date("2026-06-01"), notionId: "373f6788-631d-80b7-bce3-d32dc2de943c" },
  { name: "MAD VENDAS E LICENCIAMENTOS DE FRANQUIAS LTDA",               cnpj: "51.826.622/0001-04", status: "CONCLUIDO" as const, date: new Date("2026-06-02"), notionId: "373f6788-631d-80c3-bc08-e44189ec4744" },
  { name: "POSTO STO ESTEVAO LTDA",                                      cnpj: "36.642.879/0001-12", status: "CONCLUIDO" as const, date: new Date("2026-06-02"), notionId: "373f6788-631d-806f-a2dd-d03e989733c1" },
  { name: "FEO ODONTOLOGIA LTDA",                                        cnpj: "32.190.155/0001-24", status: "CONCLUIDO" as const, date: new Date("2026-06-15"), notionId: "380f6788-631d-8087-96bd-e5df3389655e" },
  { name: "VISAO NF LOGISTICA E PARTICIPACOES LTDA",                     cnpj: "08.818.770/0001-58", status: "CONCLUIDO" as const, date: new Date("2026-05-27"), notionId: "373f6788-631d-80bf-953f-d617cae37baf" },
  { name: "CCN - COMERCIAL CENTRO NORTE ALIMENTOS LTDA",                 cnpj: "08.638.790/0001-47", status: "CONCLUIDO" as const, date: new Date("2026-05-27"), notionId: "373f6788-631d-80cf-a048-e0ccef62c318" },
  { name: "KINSHU SUSHI DELIVERY LTDA",                                  cnpj: "32.076.198/0001-83", status: "CONCLUIDO" as const, date: new Date("2026-06-08"), notionId: "37af6788-631d-806d-8903-deb8ef34612b" },
  { name: "MAD SUSHI LTDA",                                              cnpj: "34.703.211/0001-02", status: "CONCLUIDO" as const, date: new Date("2026-06-02"), notionId: "373f6788-631d-8096-b66c-cabd558dc9ed" },
  { name: "CANTINHO DOS BICHINHOS LTDA",                                 cnpj: "48.793.162/0001-50", status: "CONCLUIDO" as const, date: new Date("2026-06-12"), notionId: "37df6788-631d-806a-9970-f957ec1c4564" },
  { name: "ARTE SERRA CONFECCOES LTDA",                                  cnpj: "37.647.232/0001-46", status: "CONCLUIDO" as const, date: new Date("2026-06-05"), notionId: "379f6788-631d-80bf-ac80-ceb8ce8c036c" },
  { name: "SPE HILDEGARDO 906 EMPREENDIMENTOS IMOBILIARIOS LTDA",        cnpj: "54.991.157/0001-55", status: "CONCLUIDO" as const, date: new Date("2026-04-13"), notionId: "345f6788-631d-8007-88df-daaa70626977" },
  { name: "LAVORO PAES ARTESANAIS LTDA",                                 cnpj: "32.286.829/0001-99", status: "CONCLUIDO" as const, date: new Date("2026-03-24"), notionId: "334f6788-631d-8024-bbb8-cf90782570f6" },
  { name: "PIZZA DO SEU JEITO LTDA",                                     cnpj: "66.330.170/0001-42", status: "CONCLUIDO" as const, date: new Date("2026-06-03"), notionId: "374f6788-631d-8071-ab36-c0789e0a146b" },
  { name: "MERCADO UNIAO DA SERRA LTDA",                                 cnpj: "53.215.433/0003-92", status: "CONCLUIDO" as const, date: new Date("2026-06-01"), notionId: "373f6788-631d-80b6-ad19-fb5d75505c96" },
  { name: "CENTRO DIAGNOSTICO E TERAPEUTICO",                            cnpj: "00.918.803/0002-00", status: "CONCLUIDO" as const, date: new Date("2026-03-12"), notionId: "334f6788-631d-80e1-b5fd-d23af9ca5a20" },
  { name: "MAD BREW TAP HOUSE LTDA",                                     cnpj: "31.396.982/0001-06", status: "CONCLUIDO" as const, date: new Date("2026-06-01"), notionId: "372f6788-631d-80ac-bc41-de08386db6e3" },
];

async function main() {
  let created = 0, skipped = 0;

  for (const company of companies) {
    const result = await prisma.company.upsert({
      where: { notionId: company.notionId },
      create: company,
      update: {},
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      skipped++;
    }
    console.log(`✓ ${company.name}`);
  }

  console.log(`\n${created} criadas, ${skipped} já existiam.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
