import { NextResponse } from "next/server";
import type { UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { getNotionClient } from "@/lib/notion-auth";
import { getPage, updatePage, archivePage } from "@/lib/notion-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const result = await getNotionClient();
  if (!result.client) {
    return NextResponse.json(null, { status: result.reason === "unauthenticated" ? 401 : 404 });
  }

  const page = await getPage(result.client, id);
  return NextResponse.json(page);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const result = await getNotionClient();
  if (!result.client) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  const { properties } = (await request.json()) as Pick<UpdatePageParameters, "properties">;
  const page = await updatePage(result.client, id, properties);
  return NextResponse.json(page);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const result = await getNotionClient();
  if (!result.client) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  const page = await archivePage(result.client, id);
  return NextResponse.json(page);
}
