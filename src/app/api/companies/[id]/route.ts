import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { companyUpdateSchema } from "@/lib/schemas";
import { updateCompany, deleteCompany } from "@/lib/company-service";

type Params = { params: Promise<{ id: string }> };

export const PUT = apiRoute(async (req, { params }: Params) => {
  const { id } = await params;
  return NextResponse.json(await updateCompany(id, await parseBody(req, companyUpdateSchema)));
});

export const DELETE = apiRoute(async (_req, { params }: Params) => {
  const { id } = await params;
  await deleteCompany(id);
  return NextResponse.json({ ok: true });
});
