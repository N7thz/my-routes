import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { requireUserId } from "@/lib/session";
import { rejectBearer, revokeApiToken } from "@/lib/api-token-service";

export const DELETE = apiRoute(async (req, { params }: { params: Promise<{ id: string }> }) => {
  rejectBearer(req);
  const { id } = await params;
  await revokeApiToken(await requireUserId(), id);
  return NextResponse.json({ ok: true });
});
