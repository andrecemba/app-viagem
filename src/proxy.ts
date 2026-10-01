import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, sessionSecret, verifySessionToken } from "@/lib/admin/session";

/**
 * Primeira barreira da área administrativa: sem sessão válida, /admin redireciona
 * para o login e /api/admin responde 401. Cada página e ação ainda confere a
 * sessão no servidor (src/lib/admin/auth.ts); o proxy não é a única proteção.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/entrar";

  const response = (() => {
    if (isLogin) return NextResponse.next();
    const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret());
    if (session) return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const url = new URL("/admin/entrar", request.url);
    if (pathname !== "/admin") url.searchParams.set("voltar", pathname);
    return NextResponse.redirect(url);
  })();

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
