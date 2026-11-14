import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UnauthenticatedError } from "@/lib/http-errors";
import { bearerToken, userIdFromBearer } from "@/lib/api-token-service";
import { oauthBearer, userIdFromOAuthBearer } from "@/lib/mcp/oauth";

/**
 * Usuário da requisição atual, ou null sem sessão. Vale o cookie de sessão ou,
 * para clientes sem navegador (servidor MCP), `Authorization: Bearer` com um
 * token pessoal (`mr_...`) ou um access token OAuth do plugin `mcp`.
 */
export async function getSessionUser() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (session) return session.user;

  const request = { headers: requestHeaders };
  let userId: string | null = null;
  if (bearerToken(requestHeaders)) userId = await userIdFromBearer(request);
  else if (oauthBearer(requestHeaders)) userId = await userIdFromOAuthBearer(request);
  return userId ? prisma.user.findUnique({ where: { id: userId } }) : null;
}

export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new UnauthenticatedError();
  return user.id;
}
