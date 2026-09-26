import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Escopos que permitem LER eventos (qualquer um serve). Inclui o antigo
// readonly para não quebrar contas conectadas antes da migração para escrita.
const READ_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar",
];
// Escopos que permitem CRIAR/editar eventos.
const WRITE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar",
];

type GoogleAccountResult =
  | { accessToken: string; hasCalendarScope: true; canWriteEvents: boolean }
  | { accessToken: null; hasCalendarScope: false; reason: "not-connected" | "no-calendar-scope" | "unauthenticated" };

async function refreshGoogleToken(
  accountId: string,
  refreshToken: string
): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { access_token: string; expires_in: number };

  await prisma.account.update({
    where: { id: accountId },
    data: {
      accessToken: data.access_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

/**
 * Versão sem sessão: recebe o usuário explicitamente. Usada por jobs que rodam
 * fora de uma requisição autenticada (ex.: cron da Vercel).
 */
export async function getGoogleCalendarTokenForUser(
  userId: string
): Promise<GoogleAccountResult> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      accessTokenExpiresAt: true,
      scope: true,
    },
  });

  if (!account) return { accessToken: null, hasCalendarScope: false, reason: "not-connected" };

  const scope = account.scope ?? "";
  const hasReadScope = READ_SCOPES.some((s) => scope.includes(s));
  if (!hasReadScope) {
    return { accessToken: null, hasCalendarScope: false, reason: "no-calendar-scope" };
  }
  const canWriteEvents = WRITE_SCOPES.some((s) => scope.includes(s));

  const isExpired = account.accessTokenExpiresAt
    ? account.accessTokenExpiresAt < new Date()
    : false;

  if (!isExpired && account.accessToken) {
    return { accessToken: account.accessToken, hasCalendarScope: true, canWriteEvents };
  }

  if (account.refreshToken) {
    const refreshed = await refreshGoogleToken(account.id, account.refreshToken);
    if (refreshed) return { accessToken: refreshed, hasCalendarScope: true, canWriteEvents };
  }

  return { accessToken: null, hasCalendarScope: false, reason: "no-calendar-scope" };
}

export async function getGoogleCalendarToken(): Promise<GoogleAccountResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { accessToken: null, hasCalendarScope: false, reason: "unauthenticated" };
  }
  return getGoogleCalendarTokenForUser(session.user.id);
}
