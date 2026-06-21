import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

type GoogleAccountResult =
  | { accessToken: string; hasCalendarScope: true }
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

export async function getGoogleCalendarToken(): Promise<GoogleAccountResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { accessToken: null, hasCalendarScope: false, reason: "unauthenticated" };

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "google" },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      accessTokenExpiresAt: true,
      scope: true,
    },
  });

  if (!account) return { accessToken: null, hasCalendarScope: false, reason: "not-connected" };

  if (!account.scope?.includes(CALENDAR_SCOPE)) {
    return { accessToken: null, hasCalendarScope: false, reason: "no-calendar-scope" };
  }

  const isExpired = account.accessTokenExpiresAt
    ? account.accessTokenExpiresAt < new Date()
    : false;

  if (!isExpired && account.accessToken) {
    return { accessToken: account.accessToken, hasCalendarScope: true };
  }

  if (account.refreshToken) {
    const refreshed = await refreshGoogleToken(account.id, account.refreshToken);
    if (refreshed) return { accessToken: refreshed, hasCalendarScope: true };
  }

  return { accessToken: null, hasCalendarScope: false, reason: "no-calendar-scope" };
}
