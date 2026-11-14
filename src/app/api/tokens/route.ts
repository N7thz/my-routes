import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { requireUserId } from "@/lib/session";
import { createApiToken, listApiTokens, rejectBearer } from "@/lib/api-token-service";

const tokenCreateSchema = z.object({ name: z.string().trim().min(1, "Informe um nome").max(60) });

export const GET = apiRoute(async (req) => {
  rejectBearer(req);
  return NextResponse.json(await listApiTokens(await requireUserId()));
});

/** Devolve o token em claro uma única vez; depois só o prefixo fica visível. */
export const POST = apiRoute(async (req) => {
  rejectBearer(req);
  const { name } = await parseBody(req, tokenCreateSchema);
  const created = await createApiToken(await requireUserId(), name);
  return NextResponse.json(created, { status: 201 });
});
