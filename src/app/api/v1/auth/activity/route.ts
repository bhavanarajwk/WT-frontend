import { NextRequest, NextResponse } from "next/server";
import { backendUnavailableResponse, buildCookieHeader, getBackendBaseUrl } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieHeader = buildCookieHeader(request, ["tokenId", "refreshToken"]);
  let upstream: Response;
  try {
    upstream = await fetch(`${getBackendBaseUrl()}/api/v1/auth/activity`, {
      method: "POST",
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });
  } catch {
    return backendUnavailableResponse();
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
