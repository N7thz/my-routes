import { NextResponse } from "next/server";
import {
  isRunrunitConfigured,
  listRunrunitTasks,
  getAllRunrunitTasks,
} from "@/lib/runrunit-service";

export async function GET(request: Request) {
  if (!isRunrunitConfigured()) {
    return NextResponse.json({ reason: "not-configured" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode === "all") {
    const tasks = await getAllRunrunitTasks();
    return NextResponse.json(tasks);
  }

  const month = searchParams.get("month") ?? undefined;
  const tasks = await listRunrunitTasks({ month });
  return NextResponse.json(tasks);
}
