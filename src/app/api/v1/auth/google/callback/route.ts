import { NextRequest, NextResponse } from "next/server";
import {
  getAppBaseUrl,
  getBackendBaseUrl,
  setAuthCookies,
  type SessionTokens,
} from "@/lib/serverApi";

export const dynamic = "force-dynamic";

function loginRedirect(request: NextRequest, error?: string) {
  const url = new URL("/login", getAppBaseUrl(request));
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

  const appBaseUrl = getAppBaseUrl(request);
  const redirectUri = `${appBaseUrl}/api/v1/auth/google/callback`;
  let exchangeResponse: Response;
  try {
    exchangeResponse = await fetch(`${getBackendBaseUrl()}/api/v1/auth/google/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: redirectUri, state }),
      credentials: "include",
    });
  } catch {
    return loginRedirect(request, "backend_unavailable");
  }

  if (!exchangeResponse.ok) {
    const knownErrors = new Set([
      "unregistered_user",
      "account_inactive",
      "unauthorized_email_domain",
      "invalid_redirect_uri",
      "google_token_exchange_failed",
      "invalid_oauth_state",
      "backend_unavailable",
    ]);
    let errorCode = "oauth_login_failed";
    try {
      const payload = (await exchangeResponse.json()) as { detail?: string };
      const detail = payload.detail?.trim();
      if (detail && knownErrors.has(detail)) {
        errorCode = detail;
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

  const response = NextResponse.redirect(new URL("/dashboard", appBaseUrl));
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
