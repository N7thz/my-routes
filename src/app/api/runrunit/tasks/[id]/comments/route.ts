import { NextResponse } from "next/server";
import { apiRoute, HttpError } from "@/lib/api-handler";
import { isRunrunitConfigured, listTaskComments } from "@/lib/runrunit-service";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req, { params }: Params) => {
  if (!isRunrunitConfigured()) {
    return NextResponse.json({ reason: "not-configured" }, { status: 404 });
  }
  const id = Number((await params).id);
  if (!Number.isInteger(id)) throw new HttpError(400, "id de tarefa inválido");
  return NextResponse.json(await listTaskComments(id));
});
