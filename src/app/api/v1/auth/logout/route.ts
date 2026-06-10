import { NextRequest, NextResponse } from "next/server";
import { buildCookieHeader, clearAuthCookies, getBackendBaseUrl } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieHeader = buildCookieHeader(request, ["tokenId"]);
  const upstream = await fetch(`${getBackendBaseUrl()}/api/v1/auth/logout`, {
    method: "POST",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

  const body = await upstream.text();
  const response = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
  clearAuthCookies(response);
  return response;
}
