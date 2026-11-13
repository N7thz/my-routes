import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { routeGenerateSchema } from "@/lib/schemas";
import { generateRouteFromDate } from "@/lib/route-service";

export const POST = apiRoute(async (req) => {
  const { date } = await parseBody(req, routeGenerateSchema);
  return NextResponse.json(await generateRouteFromDate(date), { status: 201 });
});
