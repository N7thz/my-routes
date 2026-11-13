import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client";

// Em runtime (serverless) usamos o pooler em modo transação (DATABASE_URL): cada
// instância abre poucas conexões e o pooler as multiplexa. A DIRECT_URL (modo
// sessão) fica para as migrations, no prisma.config.ts.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL,
  // O certificado do pooler não está na cadeia de confiança padrão do Node.
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10_000,
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
