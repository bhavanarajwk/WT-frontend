export function normalizeUserStatus(status: unknown): string {
  return String(status ?? "").trim().toUpperCase();
}

export function isActiveUserStatus(status: unknown): boolean {
  return normalizeUserStatus(status) === "ACTIVE";
}

export function isOffboardedUserStatus(status: unknown): boolean {
  const normalized = normalizeUserStatus(status);
  return normalized === "OFFBOARDED" || normalized === "OFF_BOARDED";
}

/** Status from GET /profile (or session user). */
export function resolveProfileStatus(
  profile: Record<string, unknown> | null | undefined,
  user?: { status?: string } | null
): string {
  return normalizeUserStatus(profile?.status ?? profile?.user_status ?? user?.status);
}
