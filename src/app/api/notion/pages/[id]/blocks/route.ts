import { NextResponse } from "next/server";
import { getNotionClient } from "@/lib/notion-auth";
import { getPageBlocks } from "@/lib/notion-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const result = await getNotionClient();
  if (!result.client) {
    return NextResponse.json(null, { status: result.reason === "unauthenticated" ? 401 : 404 });
  }

  const blocks = await getPageBlocks(result.client, id);
  return NextResponse.json(blocks);
}
