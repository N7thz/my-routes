import "server-only";
import { Client } from "@notionhq/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

type NotionClientResult =
  | { client: Client }
  | { client: null; reason: "unauthenticated" | "not-connected" };

export async function getNotionClient(): Promise<NotionClientResult> {
  const user = await getSessionUser();
  if (!user) return { client: null, reason: "unauthenticated" };

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "notion" },
    select: { accessToken: true },
  });

  if (!account?.accessToken) return { client: null, reason: "not-connected" };

  return { client: new Client({ auth: account.accessToken }) };
}
