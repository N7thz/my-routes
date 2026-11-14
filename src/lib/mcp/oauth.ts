import "server-only";
import { prisma } from "@/lib/prisma";
import { TOKEN_PREFIX } from "@/lib/api-token";

// Descoberta OAuth do servidor MCP (RFC 9728 + RFC 8414) e validação do access
// token emitido pelo plugin `mcp` do Better Auth. Os endpoints de verdade
// (authorize, token, register) moram em /api/auth/mcp/*.

export const MCP_PATH = "/api/mcp";
const AUTH_BASE = "/api/auth";
const SCOPES = ["openid", "profile", "email", "offline_access"];

/**
 * Origem pública do app. Em produção é a URL fixa (a mesma do `baseURL` do
 * Better Auth, que vira o `issuer`); em dev vem da requisição, em qualquer porta.
 */
export function appOrigin(request: Request): string {
  const fixed = process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_APP_URL : undefined;
  return new URL(fixed ?? request.url).origin;
}

export function resourceMetadataUrl(origin: string): string {
  return `${origin}/.well-known/oauth-protected-resource${MCP_PATH}`;
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}${MCP_PATH}`,
    authorization_servers: [origin],
    scopes_supported: SCOPES,
    bearer_methods_supported: ["header"],
    resource_name: "My Routes",
  };
}

export function authorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}${AUTH_BASE}/mcp/authorize`,
    token_endpoint: `${origin}${AUTH_BASE}/mcp/token`,
    registration_endpoint: `${origin}${AUTH_BASE}/mcp/register`,
    scopes_supported: SCOPES,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
    code_challenge_methods_supported: ["S256"],
  };
}

/** JSON público com CORS liberado (clientes MCP no navegador leem a descoberta). */
export function metadataResponse(body: unknown): Response {
  return Response.json(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-protocol-version",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/** Access token OAuth do cabeçalho (qualquer bearer que não seja token pessoal `mr_`). */
export function oauthBearer(headers: Pick<Headers, "get">): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(headers.get("authorization") ?? "");
  return match && !match[1].startsWith(TOKEN_PREFIX) ? match[1] : null;
}

/** Dono do access token OAuth do cabeçalho, ou null se ausente, desconhecido ou vencido. */
export async function userIdFromOAuthBearer(request: Pick<Request, "headers">): Promise<string | null> {
  const token = oauthBearer(request.headers);
  if (!token) return null;
  const row = await prisma.oauthAccessToken.findUnique({
    where: { accessToken: token },
    select: { userId: true, accessTokenExpiresAt: true },
  });
  if (!row?.userId || row.accessTokenExpiresAt.getTime() <= Date.now()) return null;
  return row.userId;
}
