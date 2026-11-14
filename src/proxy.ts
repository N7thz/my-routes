import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "@/lib/auth";

const LOGIN = "/login";

/**
 * Filtro rápido: só confere se o cookie de sessão existe, sem ir ao banco. A
 * validação de verdade fica com quem serve o dado — `apiRoute` nas rotas da
 * API e o layout do app nas páginas (que manda para o login se a sessão for
 * inválida ou expirada).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A cron da Vercel não tem sessão (a rota confere o CRON_SECRET sozinha) e o
  // servidor MCP chega com token pessoal (a rota valida o bearer sozinha).
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron/") || pathname === "/api/mcp") {
    return NextResponse.next();
  }

  if (pathname === LOGIN || pathname.startsWith(`${LOGIN}/`)) {
    // Aqui a checagem é completa: com um cookie velho, mandar para "/" faria o
    // layout devolver para o login, num loop.
    const session = await auth.api.getSession({ headers: request.headers });
    return session ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (getSessionCookie(request)) return NextResponse.next();

  // API responde 401 em JSON (o cliente trata); página vai para o login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado", reason: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.redirect(new URL(LOGIN, request.url));
}

export const config = {
  matcher: [
    // exclui assets públicos do PWA (manifest, service worker, ícones, página offline)
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|apple-icon|offline|.*\\.png$|.*\\.svg$).*)",
  ],
};
