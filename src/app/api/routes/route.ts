import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { routeCreateSchema } from "@/lib/schemas";
import { listRoutes, createRoute } from "@/lib/route-service";

export const GET = apiRoute(async () => NextResponse.json(await listRoutes()));

export const POST = apiRoute(async (req) => {
  const route = await createRoute(await parseBody(req, routeCreateSchema));
  return NextResponse.json(route, { status: 201 });
});
