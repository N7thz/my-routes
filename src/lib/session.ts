import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UnauthenticatedError } from "@/lib/http-errors";
import { bearerToken, userIdFromBearer } from "@/lib/api-token-service";

/**
 * Usuário da requisição atual, ou null sem sessão. Vale o cookie de sessão ou,
 * para clientes sem navegador (servidor MCP), um token pessoal
 * `Authorization: Bearer mr_...`.
 */
export async function getSessionUser() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (session) return session.user;

  if (!bearerToken(requestHeaders)) return null;
  const userId = await userIdFromBearer({ headers: requestHeaders });
  return userId ? prisma.user.findUnique({ where: { id: userId } }) : null;
}

export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new UnauthenticatedError();
  return user.id;
}
