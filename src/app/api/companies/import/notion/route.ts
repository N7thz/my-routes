import { NextResponse } from "next/server";
import { apiRoute, HttpError } from "@/lib/api-handler";
import { getNotionClient } from "@/lib/notion-auth";
import { importFromNotion } from "@/lib/company-service";

export const POST = apiRoute(async () => {
  const notion = await getNotionClient();
  if (!notion.client) throw new HttpError(403, "Notion não conectado", notion.reason);
  return NextResponse.json(await importFromNotion(notion.client));
});
