import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { isRunrunitConfigured, listRunrunitTasks } from "@/lib/runrunit-service";

export const GET = apiRoute(async (request) => {
  if (!isRunrunitConfigured()) {
    return NextResponse.json({ reason: "not-configured" }, { status: 404 });
  }
  const month = new URL(request.url).searchParams.get("month") ?? undefined;
  return NextResponse.json(await listRunrunitTasks(month));
});
