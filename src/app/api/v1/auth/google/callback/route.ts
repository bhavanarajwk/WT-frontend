import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, setAuthCookies, type SessionTokens } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

function loginRedirect(request: NextRequest, error?: string) {
  const url = new URL("/login", request.nextUrl.origin);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return loginRedirect(request, "oauth_failed");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("oauthState")?.value;

  if (!code) {
    return loginRedirect(request, "missing_oauth_code");
  }
  if (!state || !expectedState || state !== expectedState) {
    return loginRedirect(request, "invalid_oauth_state");
  }

  const redirectUri = `${request.nextUrl.origin}/api/v1/auth/google/callback`;
  const exchangeResponse = await fetch(`${getBackendBaseUrl()}/api/v1/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });

  if (!exchangeResponse.ok) {
    let errorCode = "oauth_login_failed";
    try {
      const payload = (await exchangeResponse.json()) as { detail?: string };
      if (payload.detail === "unregistered_user") {
        errorCode = "unregistered_user";
      }
    } catch {
      /* ignore parse errors */
    }
    return loginRedirect(request, errorCode);
  }

  const payload = (await exchangeResponse.json()) as {
    data: SessionTokens & { message?: string };
  };
  const data = payload.data;

  const response = NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  setAuthCookies(response, data);
  response.cookies.set("oauthState", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
