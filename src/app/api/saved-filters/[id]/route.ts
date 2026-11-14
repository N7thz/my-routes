import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { deleteSavedFilter } from "@/lib/saved-filter-service";

type Params = { params: Promise<{ id: string }> };

export const DELETE = apiRoute(async (_req, { params }: Params) => {
  const { id } = await params;
  await deleteSavedFilter(id);
  return NextResponse.json({ ok: true });
});
