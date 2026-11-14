import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { requireUserId } from "@/lib/session";
import { unignoreEventTitle } from "@/lib/calendar-ignore-service";

type Params = { params: Promise<{ id: string }> };

/** Volta a considerar o título na agenda. */
export const DELETE = apiRoute(async (_req, { params }: Params) => {
  const { id } = await params;
  await unignoreEventTitle(await requireUserId(), id);
  return NextResponse.json({ ok: true });
});
