import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { companyGroupUpdateSchema } from "@/lib/schemas";
import { updateCompanyGroup, deleteCompanyGroup } from "@/lib/company-group-service";

type Params = { params: Promise<{ id: string }> };

export const PUT = apiRoute(async (req, { params }: Params) => {
  const { id } = await params;
  return NextResponse.json(await updateCompanyGroup(id, await parseBody(req, companyGroupUpdateSchema)));
});

export const DELETE = apiRoute(async (_req, { params }: Params) => {
  const { id } = await params;
  await deleteCompanyGroup(id);
  return NextResponse.json({ ok: true });
});
