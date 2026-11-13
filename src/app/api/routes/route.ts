import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { routeCreateSchema, routeRangeSchema } from "@/lib/schemas";
import { listRoutes, createRoute } from "@/lib/route-service";

export const GET = apiRoute(async (req) => {
  const params = new URL(req.url).searchParams;
  const range = routeRangeSchema.parse({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  });
  return NextResponse.json(await listRoutes(range));
});

export const POST = apiRoute(async (req) => {
  const route = await createRoute(await parseBody(req, routeCreateSchema));
  return NextResponse.json(route, { status: 201 });
});
