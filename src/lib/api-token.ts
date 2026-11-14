import { createHash, randomBytes } from "node:crypto";

// Parte pura do token pessoal (sem banco), separada para ser testável.

export const TOKEN_PREFIX = "mr_";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

/** Token do cabeçalho `Authorization: Bearer mr_...`, ou null se ausente/de outro tipo. */
export function bearerToken(headers: Pick<Headers, "get">): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(headers.get("authorization") ?? "");
  return match?.[1].startsWith(TOKEN_PREFIX) ? match[1] : null;
}
