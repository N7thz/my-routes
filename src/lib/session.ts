import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Usuário da requisição atual, ou null sem sessão. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Não autenticado");
  return user.id;
}
