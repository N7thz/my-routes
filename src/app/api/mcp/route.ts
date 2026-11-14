import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { userIdFromBearer } from "@/lib/api-token-service";
import { createMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Servidor MCP (Streamable HTTP, stateless). O proxy deixa passar sem cookie;
 * aqui só entra quem manda um token pessoal válido (`Authorization: Bearer mr_...`).
 * As tools chamam os serviços, que leem o usuário do mesmo cabeçalho.
 */
async function handle(req: Request): Promise<Response> {
  if (!(await userIdFromBearer(req))) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Não autenticado: envie um token pessoal" }, id: null },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="my-routes"' } }
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
