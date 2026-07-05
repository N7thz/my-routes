import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const publicRoutes = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // exclui assets públicos do PWA (manifest, service worker, ícones, página offline)
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|apple-icon|offline|.*\\.png$|.*\\.svg$).*)",
  ],
};
