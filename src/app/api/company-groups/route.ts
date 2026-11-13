import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { companyGroupCreateSchema } from "@/lib/schemas";
import { listCompanyGroups, createCompanyGroup } from "@/lib/company-group-service";

export const GET = apiRoute(async () => NextResponse.json(await listCompanyGroups()));

export const POST = apiRoute(async (req) => {
  const group = await createCompanyGroup(await parseBody(req, companyGroupCreateSchema));
  return NextResponse.json(group, { status: 201 });
});
