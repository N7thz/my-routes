import { NextResponse } from "next/server";
import { updateCompany, deleteCompany } from "@/lib/company-service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const company = await updateCompany(id, body);
  return NextResponse.json(company);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await deleteCompany(id);
  return NextResponse.json({ ok: true });
}
