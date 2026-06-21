import { NextRequest, NextResponse } from "next/server";
import { listRoutes, createRoute } from "@/lib/route-service";

export async function GET() {
  const routes = await listRoutes();
  return NextResponse.json(routes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  const route = await createRoute(body);
  return NextResponse.json(route, { status: 201 });
}
