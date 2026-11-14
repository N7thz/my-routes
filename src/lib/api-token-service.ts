import "server-only";
import { prisma } from "@/lib/prisma";
import { HttpError, NotFoundError } from "@/lib/http-errors";
import { TOKEN_PREFIX, bearerToken, generateToken, hashToken } from "@/lib/api-token";

// Token pessoal (bearer) para o servidor MCP e outros clientes sem cookie. Só o
// hash sha256 vai para o banco; o token em claro existe uma única vez, na criação.

export { bearerToken };

const PREFIX_LENGTH = TOKEN_PREFIX.length + 6;
/** `lastUsedAt` só é regravado depois deste intervalo, para não escrever a cada chamada. */
const LAST_USED_INTERVAL_MS = 60_000;

export type ApiTokenRecord = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
};

const select = { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true } as const;

/** Gerir tokens exige a sessão do navegador: um token vazado não pode criar outros. */
export function rejectBearer(request: Pick<Request, "headers">): void {
  if (bearerToken(request.headers)) {
    throw new HttpError(403, "Gerencie tokens pelo app, com a sessão do navegador");
  }
}

export async function listApiTokens(userId: string): Promise<ApiTokenRecord[]> {
  return prisma.apiToken.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select });
}

/** Cria o token e devolve o valor em claro (única vez em que ele existe). */
export async function createApiToken(
  userId: string,
  name: string
): Promise<ApiTokenRecord & { token: string }> {
  const token = generateToken();
  const record = await prisma.apiToken.create({
    data: { userId, name, tokenHash: hashToken(token), prefix: token.slice(0, PREFIX_LENGTH) },
    select,
  });
  return { ...record, token };
}

export async function revokeApiToken(userId: string, id: string): Promise<void> {
  const { count } = await prisma.apiToken.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("Token não encontrado");
}

/** Dono do token do cabeçalho, ou null se não houver token válido. */
export async function userIdFromBearer(request: Pick<Request, "headers">): Promise<string | null> {
  const token = bearerToken(request.headers);
  if (!token) return null;

  const row = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, lastUsedAt: true },
  });
  if (!row) return null;

  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > LAST_USED_INTERVAL_MS) {
    // Melhor esforço: falhar em marcar o uso não pode derrubar a chamada.
    await prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return row.userId;
}
