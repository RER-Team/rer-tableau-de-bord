import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisser passer :
  // - la page de login
  // - les routes d'auth NextAuth
  // - les assets Next.js et fichiers statiques usuels
  if (
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/default-logo.svg" ||
    pathname.startsWith("/decouvrir") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/admin/logo" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req });

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
