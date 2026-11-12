import { NextRequest, NextResponse } from "next/server";
import {
  listCompanyGroups,
  createCompanyGroup,
  GroupNameTakenError,
} from "@/lib/company-group-service";

export async function GET() {
  const groups = await listCompanyGroups();
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  try {
    const group = await createCompanyGroup(body);
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    if (err instanceof GroupNameTakenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
