import { NextResponse } from "next/server";
import { isRunrunitConfigured, listRunrunitTasks } from "@/lib/runrunit-service";

export async function GET(request: Request) {
  if (!isRunrunitConfigured()) {
    return NextResponse.json({ reason: "not-configured" }, { status: 404 });
  }
  const month = new URL(request.url).searchParams.get("month") ?? undefined;
  return NextResponse.json(await listRunrunitTasks(month));
}
