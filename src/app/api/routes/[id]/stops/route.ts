import { NextRequest, NextResponse } from "next/server";
import { addStop } from "@/lib/route-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: routeId } = await params;
  const body = await req.json();
  if (!body.address || typeof body.address !== "string") {
    return NextResponse.json({ error: "Endereço é obrigatório" }, { status: 400 });
  }
  const stop = await addStop(routeId, body);
  return NextResponse.json(stop, { status: 201 });
}
