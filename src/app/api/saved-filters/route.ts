import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { savedFilterCreateSchema, savedFilterScreenSchema } from "@/lib/schemas";
import { listSavedFilters, saveFilter } from "@/lib/saved-filter-service";

export const GET = apiRoute(async (req) => {
  const screen = savedFilterScreenSchema.parse(new URL(req.url).searchParams.get("screen"));
  return NextResponse.json(await listSavedFilters(screen));
});

export const POST = apiRoute(async (req) => {
  const filter = await saveFilter(await parseBody(req, savedFilterCreateSchema));
  return NextResponse.json(filter, { status: 201 });
});
