export type EmployeeStatusTone = "active" | "inactive" | "invited" | "in_notice" | "neutral";

export function normalizeUserStatus(status: unknown): string {
  return String(status ?? "").trim().toUpperCase();
}

/** Canonical employee status key for badge styling (handles spaces, hyphens, underscores). */
export function normalizeEmployeeStatusKey(status: unknown): string {
  const compact = String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (compact === "INNOTICE") return "IN_NOTICE";
  if (compact === "NOTICE") return "IN_NOTICE";
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
    case "IN_NOTICE":
      return "In Notice";
    case "ONBOARDING":
      return "Onboarding";
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
  if (key === "IN_NOTICE") return "in_notice";
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

export function isInNoticeUserStatus(status: unknown): boolean {
  return normalizeEmployeeStatusKey(status) === "IN_NOTICE";
}

/** Status from GET /profile (or session user). */
export function resolveProfileStatus(
  profile: Record<string, unknown> | null | undefined,
  user?: { status?: string } | null
): string {
  return normalizeUserStatus(profile?.status ?? profile?.user_status ?? user?.status);
}
