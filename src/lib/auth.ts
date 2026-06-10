/**
 * Auth API client — wraps all /api/v1/auth endpoints.
 * Cookies are HttpOnly and managed server-side; all requests use credentials: 'include'.
 */
import { endpoints } from "@/api/endpoints";
import { ApiError } from "@/api/error";
import { apiClient, normalizeApiBaseUrl } from "@/api/httpClient";

export interface AuthUser {
  message: string;
  email: string;
  name: string;
  roles: string[];
  status: string;
  user_type: string;
  requiresSelfOnboarding?: boolean;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

const API_BASE = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
);

/**
 * Initiates the Google OAuth flow.
 * Navigate the browser directly to this URL (do not fetch).
 */
export function getGoogleSignInUrl(): string {
  return `${API_BASE}${endpoints.auth.googleSignIn}`;
}

/**
 * Attempts to refresh the session using HttpOnly cookies.
 * Returns the user data on success, or null on 401.
 */
export async function refreshSession(): Promise<AuthUser | null> {
  try {
    const body = await apiClient.post<ApiResponse<AuthUser>>(endpoints.auth.refresh, {
      skipAuth: true,
    });
    return body.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    return null;
  }
}

/**
 * Logs out the current session and clears auth cookies server-side.
 * Best-effort: network or server errors are ignored so the client can still sign out locally.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post<ApiResponse<null>>(endpoints.auth.logout, {
      skipAuth: true,
    });
  } catch {
    // Backend unreachable or logout endpoint failed — local session is cleared by signOut.
  }
}

/**
 * Dev/staging only — bypasses Google OAuth.
 */
export async function devBypassLogin(email: string): Promise<AuthUser | null> {
  const body = await apiClient.get<ApiResponse<AuthUser>>(endpoints.auth.oauthBypass(email), {
    skipAuth: true,
  });
  return body.data;
}

/** Human-readable messages for OAuth error query params */
export const oauthErrorMessages: Record<string, string> = {
  oauth_failed: "Google sign-in was cancelled or returned an error.",
  invalid_oauth_state: "Security validation failed. Please try again.",
  missing_oauth_code: "No authorization code received from Google.",
  unregistered_user:
    "Your Google account is not registered. Please contact your administrator.",
  oauth_login_failed: "Sign-in failed. Please try again.",
};
