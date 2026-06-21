import "server-only";
import { headers } from "next/headers";
import { Client } from "@notionhq/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type NotionClientResult =
  | { client: Client; userId: string }
  | { client: null; reason: "unauthenticated" | "not-connected" };

export async function getNotionClient(): Promise<NotionClientResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { client: null, reason: "unauthenticated" };

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "notion" },
    select: { accessToken: true },
  });

  if (!account?.accessToken) return { client: null, reason: "not-connected" };

  return {
    client: new Client({ auth: account.accessToken }),
    userId: session.user.id,
  };
}
