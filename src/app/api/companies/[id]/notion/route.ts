import { NextResponse } from "next/server";
import { APIErrorCode, isNotionClientError } from "@notionhq/client";
import { apiRoute, HttpError } from "@/lib/api-handler";
import { getNotionClient } from "@/lib/notion-auth";
import { createNotionPageForCompany } from "@/lib/company-service";

type Params = { params: Promise<{ id: string }> };

/** Cria a página da empresa no database do Notion (ou devolve a que já existe). */
export const POST = apiRoute(async (_req, { params }: Params) => {
  const { id } = await params;
  const notion = await getNotionClient();
  if (!notion.client) {
    throw new HttpError(403, "Conecte sua conta do Notion primeiro", notion.reason);
  }

  try {
    const result = await createNotionPageForCompany(notion.client, id);
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (err) {
    if (isNotionClientError(err)) {
      // ObjectNotFound = a integração não tem acesso ao database de empresas.
      throw new HttpError(
        502,
        err.code === APIErrorCode.ObjectNotFound
          ? "A conexão do Notion não tem acesso ao database de empresas"
          : `Notion recusou a criação da página: ${err.message}`
      );
    }
    throw err;
  }
});
