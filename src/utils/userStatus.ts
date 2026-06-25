export type EmployeeStatusTone =
  | "active"
  | "inactive"
  | "invited"
  | "serving_notice"
  | "neutral";

export function normalizeUserStatus(status: unknown): string {
  return String(status ?? "").trim().toUpperCase();
}

/** Canonical employee status key for badge styling (handles spaces, hyphens, underscores). */
export function normalizeEmployeeStatusKey(status: unknown): string {
  const compact = String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (compact === "ONBOARDING") return "INVITED";
  if (compact === "OFFBOARDED") return "INACTIVE";
  if (
    compact === "IN_NOTICE" ||
    compact === "INNOTICE" ||
    compact === "SERVING_NOTICE" ||
    compact === "SERVINGNOTICE" ||
    compact === "NOTICE"
  ) {
    return "SERVING_NOTICE";
  }

  return compact;
}

export function formatEmployeeStatusLabel(status: unknown): string {
  const key = normalizeEmployeeStatusKey(status);
  switch (key) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "INVITED":
      return "Invited";
    case "SERVING_NOTICE":
      return "Serving Notice";
    case "PENDING":
      return "Pending";
    default: {
      if (!key) return "—";
      return key
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }
}

export function getEmployeeStatusTone(status: unknown): EmployeeStatusTone {
  const key = normalizeEmployeeStatusKey(status);
  if (key === "ACTIVE") return "active";
  if (key === "INACTIVE") return "inactive";
  if (key === "INVITED") return "invited";
  if (key === "SERVING_NOTICE") return "serving_notice";
  return "neutral";
}

export function getEmployeeStatusBadgeClassName(status: unknown): string {
  const tone = getEmployeeStatusTone(status);
  return `wt-status-badge wt-status-badge--${tone.replace("_", "-")}`;
}

export function isActiveUserStatus(status: unknown): boolean {
  return normalizeEmployeeStatusKey(status) === "ACTIVE";
}

export function isOffboardedUserStatus(status: unknown): boolean {
  return normalizeEmployeeStatusKey(status) === "INACTIVE";
}

export function isServingNoticeUserStatus(status: unknown): boolean {
  return normalizeEmployeeStatusKey(status) === "SERVING_NOTICE";
}

/** @deprecated Use isServingNoticeUserStatus */
export function isInNoticeUserStatus(status: unknown): boolean {
  return isServingNoticeUserStatus(status);
}

/** Status from GET /profile (or session user). */
export function resolveProfileStatus(
  profile: Record<string, unknown> | null | undefined,
  user?: { status?: string } | null
): string {
  return normalizeUserStatus(profile?.status ?? profile?.user_status ?? user?.status);
}
