import { NextResponse } from "next/server";
import type { QueryDataSourceParameters } from "@notionhq/client/build/src/api-endpoints";
import { getNotionClient } from "@/lib/notion-auth";
import { queryDataSource } from "@/lib/notion-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const result = await getNotionClient();
  if (!result.client) {
    return NextResponse.json(null, { status: result.reason === "unauthenticated" ? 401 : 404 });
  }

  const body = (await request.json()) as Omit<QueryDataSourceParameters, "data_source_id">;
  const rows = await queryDataSource(result.client, id, body);
  return NextResponse.json(rows);
}
