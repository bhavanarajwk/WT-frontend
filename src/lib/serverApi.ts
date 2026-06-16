import { normalizeApiBaseUrl } from "@/api/httpClient";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

/** Upstream FastAPI base URL (server-side only). */
export function getBackendBaseUrl(): string {
  return normalizeApiBaseUrl(
    process.env.API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://localhost:8080"
  );
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
  email: string;
  name: string;
  roles: string[];
  status: string;
  user_type: string;
  session_started_at?: string;
}

const ACCESS_TOKEN_MINUTES = Number(process.env.ACCESS_TOKEN_MINUTES ?? 30);
const SESSION_MAX_HOURS = Number(process.env.SESSION_MAX_HOURS ?? 8);

function cookieBaseOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
}

export function setAuthCookies(response: NextResponse, session: SessionTokens): void {
  const base = cookieBaseOptions();
  const sessionMaxAge = SESSION_MAX_HOURS * 3600;

  response.cookies.set("accessToken", session.accessToken, {
    ...base,
    maxAge: ACCESS_TOKEN_MINUTES * 60,
  });
  response.cookies.set("refreshToken", session.refreshToken, {
    ...base,
    maxAge: sessionMaxAge,
  });
  response.cookies.set("tokenId", session.tokenId, {
    ...base,
    maxAge: sessionMaxAge,
  });
  response.cookies.set("email", session.email, { ...base, maxAge: sessionMaxAge });
  response.cookies.set("employeeName", session.name, { ...base, maxAge: sessionMaxAge });
  response.cookies.set("roles", session.roles.join(","), { ...base, maxAge: sessionMaxAge });
  response.cookies.set("status", session.status, { ...base, maxAge: sessionMaxAge });
  response.cookies.set("type", session.user_type, { ...base, maxAge: sessionMaxAge });
  if (session.session_started_at) {
    response.cookies.set("sessionStartedAt", session.session_started_at, {
      ...base,
      maxAge: sessionMaxAge,
    });
  }
}

export function clearAuthCookies(response: NextResponse): void {
  const base = cookieBaseOptions();
  for (const key of [
    "accessToken",
    "refreshToken",
    "tokenId",
    "email",
    "employeeName",
    "roles",
    "status",
    "type",
    "sessionStartedAt",
  ]) {
    response.cookies.set(key, "", { ...base, maxAge: 0 });
  }
}

/** Headers for server-side proxy calls to FastAPI (forwards session cookies + Bearer). */
export function buildUpstreamAuthHeaders(
  request: NextRequest,
  initHeaders?: Headers
): Headers {
  const headers = new Headers(initHeaders);

  const hopByHop = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
    "cookie",
    "authorization",
  ]);

  request.headers.forEach((value, key) => {
    if (hopByHop.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  const cookies = request.cookies.getAll();
  if (cookies.length) {
    headers.set(
      "cookie",
      cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")
    );
  }

  const accessToken = request.cookies.get("accessToken")?.value?.trim();
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

export function buildCookieHeader(request: Request, keys: string[]): string {
  const cookies = request.headers.get("cookie") ?? "";
  if (!keys.length) return cookies;

  const wanted = new Set(keys);
  const parts = cookies
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      const name = part.split("=")[0]?.trim();
      return name && wanted.has(name);
    });

  return parts.join("; ");
}
