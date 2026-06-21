import { NextResponse } from "next/server";
import { getNotionClient } from "@/lib/notion-auth";
import { searchWorkspace } from "@/lib/notion-service";

export async function GET(request: Request) {
  const result = await getNotionClient();
  if (!result.client) {
    const status = result.reason === "unauthenticated" ? 401 : 404;
    return NextResponse.json(null, { status });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? undefined;

  const items = await searchWorkspace(result.client, query);
  return NextResponse.json(items);
}
