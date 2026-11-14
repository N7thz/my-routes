import { NextResponse } from "next/server";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { requireUserId } from "@/lib/session";
import { ignoredEventTitleCreateSchema } from "@/lib/schemas";
import { ignoreEventTitle, listIgnoredEventTitles } from "@/lib/calendar-ignore-service";

export const GET = apiRoute(async () => {
  return NextResponse.json(await listIgnoredEventTitles(await requireUserId()));
});

/** Marca um título de evento como "não é visita". */
export const POST = apiRoute(async (req) => {
  const { label } = await parseBody(req, ignoredEventTitleCreateSchema);
  return NextResponse.json(await ignoreEventTitle(await requireUserId(), label), { status: 201 });
});
