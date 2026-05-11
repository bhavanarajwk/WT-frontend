import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (formerly middleware) — lightweight edge-level route guard.
 *
 * Strategy:
 *  - Public paths (/login, /api/*) are always allowed through.
 *  - Any other path checks for auth cookies.
 *  - If missing → redirect to /login.
 *  - If present → allow through (the AuthProvider will do a server-side
 *    refresh on mount, which rotates the token pair and re-validates).
 *
 * Note: HttpOnly cookies cannot be read by JS, but Proxy runs on the
 * server/edge and CAN inspect them via request.cookies.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ---- Always allow these paths ---- */
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico";

  if (isPublic) {
    return NextResponse.next();
  }

  /*
   * Allow access if either:
   * - accessToken exists, or
   * - refresh-session pair exists (tokenId + refreshToken).
   * This avoids redirect loops right after OAuth callback/rotation.
   */
  const hasAccessToken = request.cookies.has("accessToken");
  const hasRefreshSession =
    request.cookies.has("tokenId") && request.cookies.has("refreshToken");
  const hasToken = hasAccessToken || hasRefreshSession;

  if (!hasToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Run on everything except Next internals and static assets.
   * The negative lookahead keeps _next/static, _next/image, and
   * favicon.ico from being intercepted unnecessarily.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
