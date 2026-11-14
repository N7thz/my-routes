import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { requireUserId } from "@/lib/session";
import { runAutoRouteForUser } from "@/lib/auto-route-service";

// Empresas agendadas + agenda + geocodificação de algumas paradas + OSRM.
export const maxDuration = 60;

/** "Gerar agora": roda a rota automática do usuário logado na hora. */
export const POST = apiRoute(async () => {
  return NextResponse.json(await runAutoRouteForUser(await requireUserId()));
});
