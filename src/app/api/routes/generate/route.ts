import { NextRequest, NextResponse } from "next/server";
import { generateRouteFromDate } from "@/lib/route-service";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const date = body?.date;
  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }
  try {
    const route = await generateRouteFromDate(date);
    return NextResponse.json(route, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao gerar rota" },
      { status: 400 }
    );
  }
}
