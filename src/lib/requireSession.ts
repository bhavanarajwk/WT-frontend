import { NextRequest, NextResponse } from "next/server";

export function requireSession(request: NextRequest): NextResponse | null {
  const hasAccessToken = request.cookies.has("accessToken");
  const hasRefreshSession =
    request.cookies.has("tokenId") && request.cookies.has("refreshToken");
  const hasSessionEmail = request.cookies.has("email");

  if (hasAccessToken || hasRefreshSession || hasSessionEmail) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
