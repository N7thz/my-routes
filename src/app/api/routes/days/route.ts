import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { listRouteDays } from "@/lib/route-service";

/** Dias com rota em todo o histórico (leve), para a navegação entre dias. */
export const GET = apiRoute(async () => NextResponse.json(await listRouteDays()));
