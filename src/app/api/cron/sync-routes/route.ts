import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRunrunitConfigured } from "@/lib/runrunit-service";
import { syncRunrunitTasksToRoutes } from "@/lib/route-service";

// Roda a cada requisição (usa headers + banco); nunca cacheado.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // A Vercel Cron envia "Authorization: Bearer ${CRON_SECRET}" quando a env
  // CRON_SECRET está definida. Bloqueia chamadas externas sem o segredo.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isRunrunitConfigured()) {
    return NextResponse.json({ error: "Runrunit não configurado" }, { status: 503 });
  }

  const email = process.env.CRON_USER_EMAIL;
  if (!email) {
    return NextResponse.json({ error: "CRON_USER_EMAIL não configurado" }, { status: 503 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: `Usuário ${email} não encontrado` }, { status: 404 });
  }

  const result = await syncRunrunitTasksToRoutes(user.id);
  return NextResponse.json(result);
}
