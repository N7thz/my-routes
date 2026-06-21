import { NextResponse } from "next/server";
import { getNotionClient } from "@/lib/notion-auth";
import { importFromNotion } from "@/lib/company-service";

export async function POST() {
  const result = await getNotionClient();

  if (!result.client) {
    return NextResponse.json(
      { error: result.reason === "unauthenticated" ? "Não autenticado" : "Notion não conectado" },
      { status: result.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  const importResult = await importFromNotion(result.client);
  return NextResponse.json(importResult);
}
