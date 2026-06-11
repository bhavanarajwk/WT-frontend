import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  getBackendBaseUrl,
  setAuthCookies,
  type SessionTokens,
} from "@/lib/serverApi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const tokenId = request.cookies.get("tokenId")?.value ?? "";
  const refreshToken = request.cookies.get("refreshToken")?.value ?? "";
  const cookieHeader = [tokenId && `tokenId=${tokenId}`, refreshToken && `refreshToken=${refreshToken}`]
    .filter(Boolean)
    .join("; ");

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
    const payload = JSON.parse(body) as {
      data: SessionTokens & {
        accessToken?: string;
        refreshToken?: string;
        tokenId?: string;
      };
    };
    const data = payload.data;
    if (data?.accessToken && data.refreshToken && data.tokenId) {
      setAuthCookies(response, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenId: data.tokenId,
        email: data.email,
        name: data.name,
        roles: data.roles ?? [],
        status: data.status ?? "",
        user_type: data.user_type ?? "",
      });
    }
  } catch {
    /* keep upstream body as-is */
  }

  return response;
}
