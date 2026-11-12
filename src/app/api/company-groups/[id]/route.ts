import { NextResponse } from "next/server";
import {
  updateCompanyGroup,
  deleteCompanyGroup,
  GroupNameTakenError,
} from "@/lib/company-group-service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  try {
    const group = await updateCompanyGroup(id, body);
    return NextResponse.json(group);
  } catch (err) {
    if (err instanceof GroupNameTakenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await deleteCompanyGroup(id);
  return NextResponse.json({ ok: true });
}
