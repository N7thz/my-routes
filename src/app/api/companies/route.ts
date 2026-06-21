import { NextRequest, NextResponse } from "next/server";
import { listCompanies, createCompany } from "@/lib/company-service";

export async function GET() {
  const companies = await listCompanies();
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  const company = await createCompany(body);
  return NextResponse.json(company, { status: 201 });
}
