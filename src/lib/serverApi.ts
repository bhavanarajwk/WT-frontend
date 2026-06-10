import { normalizeApiBaseUrl } from "@/api/httpClient";
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
}

const ACCESS_TOKEN_MINUTES = Number(process.env.ACCESS_TOKEN_MINUTES ?? 1440);
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS ?? 7);

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
  const refreshMaxAge = REFRESH_TOKEN_DAYS * 86400;

  response.cookies.set("accessToken", session.accessToken, {
    ...base,
    maxAge: ACCESS_TOKEN_MINUTES * 60,
  });
  response.cookies.set("refreshToken", session.refreshToken, {
    ...base,
    maxAge: refreshMaxAge,
  });
  response.cookies.set("tokenId", session.tokenId, {
    ...base,
    maxAge: refreshMaxAge,
  });
  response.cookies.set("email", session.email, { ...base, maxAge: refreshMaxAge });
  response.cookies.set("employeeName", session.name, { ...base, maxAge: refreshMaxAge });
  response.cookies.set("roles", session.roles.join(","), { ...base, maxAge: refreshMaxAge });
  response.cookies.set("status", session.status, { ...base, maxAge: refreshMaxAge });
  response.cookies.set("type", session.user_type, { ...base, maxAge: refreshMaxAge });
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
  ]) {
    response.cookies.set(key, "", { ...base, maxAge: 0 });
  }
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
