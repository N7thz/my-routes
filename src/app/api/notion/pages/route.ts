import { NextResponse } from "next/server";
import type { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { getNotionClient } from "@/lib/notion-auth";
import { createPage } from "@/lib/notion-service";

export async function POST(request: Request) {
  const result = await getNotionClient();
  if (!result.client) {
    const status = result.reason === "unauthenticated" ? 401 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  }

  const body = (await request.json()) as CreatePageParameters;
  const page = await createPage(result.client, body);
  return NextResponse.json(page, { status: 201 });
}
