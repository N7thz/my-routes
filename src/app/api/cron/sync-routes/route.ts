import { NextResponse } from "next/server";
import { backfillCoordinates } from "@/lib/geocode";
import { prisma } from "@/lib/prisma";
import { isRunrunitConfigured } from "@/lib/runrunit-service";
import { syncCalendarEventsToRoutes, syncRunrunitTasksToRoutes } from "@/lib/route-sync-service";

// Roda a cada requisição (usa headers + banco); nunca cacheado.
export const dynamic = "force-dynamic";
// Geocodificação a 1 req/s: até ~25 s só nela.
export const maxDuration = 60;

export async function GET(request: Request) {
  // A Vercel Cron envia "Authorization: Bearer ${CRON_SECRET}". O proxy não
  // exige sessão nesta rota, então sem o segredo configurado ela fica fechada.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // As duas fontes são independentes: uma indisponível não impede a outra.
  const runrunit = isRunrunitConfigured()
    ? await syncRunrunitTasksToRoutes(user.id)
    : { skipped: "runrunit-nao-configurado" };

  const calendar = await syncCalendarEventsToRoutes(user.id);

  // Por último: as paradas criadas acima também entram no preenchimento.
  const geocode = await backfillCoordinates();

  return NextResponse.json({ runrunit, calendar, geocode });
}
