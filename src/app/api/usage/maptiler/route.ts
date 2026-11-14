import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { trackUsage } from "@/lib/usage";

/** O mapa avisa aqui a cada carregamento: no MapTiler isso é 1 sessão de mapa. */
export const POST = apiRoute(async () => {
  await trackUsage("maptiler");
  return new NextResponse(null, { status: 204 });
});
