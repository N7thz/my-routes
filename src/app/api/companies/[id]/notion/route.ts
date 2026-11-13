import { NextResponse } from "next/server";
import { APIErrorCode, isNotionClientError } from "@notionhq/client";
import { getNotionClient } from "@/lib/notion-auth";
import {
  createNotionPageForCompany,
  CompanyNotFoundError,
  NotionTemplateUnavailableError,
} from "@/lib/company-service";

type Params = { params: Promise<{ id: string }> };

/** Cria a página da empresa no database do Notion (ou devolve a que já existe). */
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const notion = await getNotionClient();

  if (!notion.client) {
    const unauthenticated = notion.reason === "unauthenticated";
    return NextResponse.json(
      { error: unauthenticated ? "Não autenticado" : "Conecte sua conta do Notion primeiro", reason: notion.reason },
      { status: unauthenticated ? 401 : 403 }
    );
  }

  try {
    const result = await createNotionPageForCompany(notion.client, id);
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (err) {
    if (err instanceof CompanyNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof NotionTemplateUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    if (isNotionClientError(err)) {
      // ObjectNotFound = a integração não tem acesso ao database de empresas.
      const message =
        err.code === APIErrorCode.ObjectNotFound
          ? "A conexão do Notion não tem acesso ao database de empresas"
          : `Notion recusou a criação da página: ${err.message}`;
      return NextResponse.json({ error: message }, { status: 502 });
    }
    throw err;
  }
}
