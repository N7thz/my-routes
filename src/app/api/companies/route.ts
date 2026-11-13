import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { companyCreateSchema } from "@/lib/schemas";
import { listCompanies, createCompany } from "@/lib/company-service";

export const GET = apiRoute(async () => NextResponse.json(await listCompanies()));

export const POST = apiRoute(async (req) => {
  const company = await createCompany(await parseBody(req, companyCreateSchema));
  return NextResponse.json(company, { status: 201 });
});
