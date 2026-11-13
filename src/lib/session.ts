import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UnauthenticatedError } from "@/lib/http-errors";

/** Usuário da requisição atual, ou null sem sessão. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new UnauthenticatedError();
  return user.id;
}
