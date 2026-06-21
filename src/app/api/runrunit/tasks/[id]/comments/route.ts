import { NextResponse } from "next/server";
import { isRunrunitConfigured, listTaskComments } from "@/lib/runrunit-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isRunrunitConfigured()) {
    return NextResponse.json({ reason: "not-configured" }, { status: 404 });
  }
  const { id } = await params;
  const comments = await listTaskComments(Number(id));
  return NextResponse.json(comments);
}
