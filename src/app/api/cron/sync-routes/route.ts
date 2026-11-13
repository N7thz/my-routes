import { NextResponse } from "next/server";
import { runAutoRouteForAllUsers } from "@/lib/auto-route-service";

// Roda a cada requisição (usa headers + banco); nunca cacheado.
export const dynamic = "force-dynamic";
// Geocodificação a 1 req/s (até ~25 s) + OSRM por rota alterada.
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

  // Todos os usuários com a rota automática ligada (e o CRON_USER_EMAIL, que
  // era o único atendido antes das configurações por usuário).
  return NextResponse.json(await runAutoRouteForAllUsers());
}
