import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { userIdFromBearer } from "@/lib/api-token-service";
import { createMcpServer } from "@/lib/mcp/server";
import { appOrigin, resourceMetadataUrl, userIdFromOAuthBearer } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Servidor MCP (Streamable HTTP, stateless). O proxy deixa passar sem cookie;
 * aqui só entra quem manda `Authorization: Bearer` com um token pessoal
 * (`mr_...`, gerado no perfil) ou um access token OAuth (claude.ai e outros
 * clientes que fazem login). As tools chamam os serviços, que leem o usuário do
 * mesmo cabeçalho.
 */
async function handle(req: Request): Promise<Response> {
  const userId = (await userIdFromBearer(req)) ?? (await userIdFromOAuthBearer(req));
  if (!userId) {
    // O `resource_metadata` é o que faz o cliente MCP descobrir o OAuth sozinho.
    const challenge = `Bearer realm="my-routes", resource_metadata="${resourceMetadataUrl(appOrigin(req))}"`;
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32001, message: "Não autenticado: faça login ou envie um token pessoal" },
        id: null,
      },
      { status: 401, headers: { "WWW-Authenticate": challenge, "Access-Control-Expose-Headers": "WWW-Authenticate" } },
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await createMcpServer().connect(transport);
  return transport.handleRequest(req);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
