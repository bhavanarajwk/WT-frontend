import { NextRequest, NextResponse } from "next/server";
import {
  buildCookieHeader,
  clearAuthCookies,
  getBackendBaseUrl,
  setAuthCookies,
  type SessionTokens,
} from "@/lib/serverApi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieHeader = buildCookieHeader(request, ["tokenId", "refreshToken"]);
  const upstream = await fetch(`${getBackendBaseUrl()}/api/v1/auth/refresh`, {
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

  if (!upstream.ok) {
    if (upstream.status === 401) {
      clearAuthCookies(response);
    }
    return response;
  }

  try {
    const payload = JSON.parse(body) as { data: SessionTokens };
    if (payload.data?.accessToken) {
      setAuthCookies(response, payload.data);
    }
  } catch {
    /* keep upstream body as-is */
  }

  return response;
}
