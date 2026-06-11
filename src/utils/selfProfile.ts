import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import {
  hasAccountManagerRole,
  hasDmRole,
  hasHrRole,
  hasManagerRole,
} from "@/utils/roles";

/** DM-only portal users cannot call GET /profile. */
export function shouldSkipSelfProfileFetch(roles: string[]): boolean {
  if (roles.includes("ROLE_EMPLOYEE")) return false;
  if (hasHrRole(roles)) return false;
  if (hasManagerRole(roles)) return false;
  if (hasAccountManagerRole(roles)) return false;
  return hasDmRole(roles);
}

export async function fetchSelfProfile(
  roles: string[]
): Promise<Record<string, unknown> | null> {
  if (shouldSkipSelfProfileFetch(roles)) {
    return null;
  }
  try {
    const res = await hrmsService.getMyProfile();
    return (res.data ?? null) as Record<string, unknown> | null;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return null;
    }
    throw err;
  }
}

export async function loadSelfProfileState(
  roles: string[],
  user?: { status?: string } | null
): Promise<{
  profile: Record<string, unknown> | null;
  isSelfOnboarded: boolean;
}> {
  const profile = await fetchSelfProfile(roles);
  const status = String(profile?.status ?? user?.status ?? "").toUpperCase();
  return {
    profile,
    isSelfOnboarded: status === "ACTIVE",
  };
}
