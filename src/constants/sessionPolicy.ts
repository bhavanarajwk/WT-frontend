/** Session security policy — keep in sync with backend SESSION_* settings. */
export const SESSION_INACTIVITY_MS =
  Number(process.env.NEXT_PUBLIC_SESSION_INACTIVITY_MINUTES ?? 30) * 60 * 1000;

export const SESSION_MAX_MS =
  Number(process.env.NEXT_PUBLIC_SESSION_MAX_HOURS ?? 8) * 60 * 60 * 1000;

/** Ping server activity before idle cutoff (server also enforces inactivity). */
export const SESSION_ACTIVITY_PING_MS = 5 * 60 * 1000;

/** Refresh access token while user is active (access token default 30 min). */
export const SESSION_REFRESH_INTERVAL_MS = 25 * 60 * 1000;

export const SESSION_STORAGE_STARTED_AT = "wt.sessionStartedAt";
export const SESSION_STORAGE_LAST_ACTIVITY = "wt.lastActivityAt";

export type SessionLogoutReason = "idle" | "expired" | "server";

export const sessionLogoutMessages: Record<SessionLogoutReason, string> = {
  idle: "You were logged out after 30 minutes of inactivity.",
  expired: "Your session has expired after 8 hours. Please sign in again.",
  server: "Your session has ended. Please sign in again.",
};
