import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { PrismaClientKnownRequestError } from "../../prisma/generated/internal/prismaNamespace";
import { getSessionUser } from "@/lib/session";
import { HttpError, UnauthenticatedError } from "@/lib/http-errors";

export * from "@/lib/http-errors";


function toResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { error: err.message, ...(err.reason && { reason: err.reason }) },
      { status: err.status }
    );
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue?.path.join(".");
    return NextResponse.json(
      { error: field ? `${field}: ${issue.message}` : (issue?.message ?? "Dados inválidos") },
      { status: 400 }
    );
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (err instanceof PrismaClientKnownRequestError) {
    // P2025: registro não existe (ou não é do usuário, pelo filtro do where).
    if (err.code === "P2025") return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (err.code === "P2002") return NextResponse.json({ error: "Registro duplicado" }, { status: 409 });
    // P2003: referência para registro inexistente (ex.: groupId de grupo apagado).
    if (err.code === "P2003") return NextResponse.json({ error: "Referência inválida" }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}

type Options = {
  /** Rota acessível sem sessão (padrão: exige usuário logado). */
  public?: boolean;
};

/**
 * Envolve um route handler: confere a sessão (o proxy só olha se o cookie
 * existe) e transforma qualquer erro lançado na resposta JSON com o status
 * certo, em vez de um 500 genérico.
 */
export function apiRoute<C>(
  handler: (req: Request, ctx: C) => Promise<Response>,
  { public: isPublic = false }: Options = {}
) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      if (!isPublic && !(await getSessionUser())) throw new UnauthenticatedError();
      return await handler(req, ctx);
    } catch (err) {
      return toResponse(err);
    }
  };
}

/** Lê o corpo JSON e valida com o schema (erro vira 400 com a mensagem do campo). */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  return schema.parse(await req.json());
}
