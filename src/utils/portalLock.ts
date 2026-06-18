export function isPortalLockedProfile(profile: Record<string, unknown> | null | undefined): boolean {
  return Boolean(profile?.portal_locked ?? profile?.portalLocked);
}

export const PORTAL_READ_ONLY_DETAIL = "portal_read_only";
