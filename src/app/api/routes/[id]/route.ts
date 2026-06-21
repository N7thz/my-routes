import { NextRequest, NextResponse } from "next/server";
import { getRoute, updateRoute, deleteRoute } from "@/lib/route-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const route = await getRoute(id);
  if (!route) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  return NextResponse.json(route);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const route = await updateRoute(id, body);
  return NextResponse.json(route);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteRoute(id);
  return NextResponse.json({ ok: true });
}
