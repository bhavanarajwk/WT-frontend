import { toTitleCase } from "@/utils/titleCase";

/** User-facing labels for canonical session roles (matches Masters role assignment). */
const SESSION_ROLE_LABELS: Record<string, string> = {
  ROLE_EMPLOYEE: "Employee",
  ROLE_HR: "HR",
  ROLE_MANAGER: "Manager",
  ROLE_ADMIN: "Admin",
  ROLE_FINANCE: "Finance",
  ROLE_AM: "Account Manager",
  ROLE_DM: "Delivery Manager",
};

/** Canonical ROLE_* names for auth/session (matches backend resolve_session_roles). */
export function normalizeRoleName(role: string): string {
  const token = role.trim().toUpperCase();
  if (!token) return token;
  return token.startsWith("ROLE_") ? token : `ROLE_${token}`;
}

export function normalizeRoles(roles: string[]): string[] {
  const out = new Set<string>();
  for (const role of roles) {
    const normalized = normalizeRoleName(role);
    if (normalized) out.add(normalized);
  }
  return Array.from(out).sort();
}

/** True when a value is a backend session role token (e.g. ROLE_EMPLOYEE), not a job designation. */
export function isSessionRoleValue(value: string): boolean {
  const token = value.trim().toUpperCase();
  if (!token) return false;
  if (SESSION_ROLE_LABELS[token]) return true;
  return Boolean(SESSION_ROLE_LABELS[normalizeRoleName(token)]);
}

/** Format a session role for display; leaves job designations unchanged. */
export function formatRoleLabel(value: string): string {
  const token = value.trim();
  if (!token) return "—";
  const upper = token.toUpperCase();
  const normalized = normalizeRoleName(upper);
  const mapped = SESSION_ROLE_LABELS[normalized] ?? SESSION_ROLE_LABELS[upper];
  if (mapped) return mapped;
  if (/^ROLE_[A-Z0-9_]+$/.test(upper)) {
    return toTitleCase(upper.slice(5).replace(/_/g, " "));
  }
  return token;
}

export function formatRoleDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  if (!text || text === "—") return "—";
  if (isSessionRoleValue(text)) return formatRoleLabel(text);
  return text;
}

export function hasHrRole(roles: string[]): boolean {
  const normalized = normalizeRoles(roles);
  return normalized.includes("ROLE_HR") || normalized.includes("ROLE_ADMIN");
}

export function hasAccountManagerRole(roles: string[]): boolean {
  return normalizeRoles(roles).includes("ROLE_AM");
}

export function hasManagerRole(roles: string[]): boolean {
  for (const role of roles) {
    const normalized = normalizeRoleName(role);
    if (normalized === "ROLE_MANAGER") return true;
  }
  return false;
}

export function hasDmRole(roles: string[]): boolean {
  return normalizeRoles(roles).includes("ROLE_DM");
}

/** Delivery manager — first-line approver for manager leave/WFH (not project PM). */
export function isDeliveryManagerUser(roles: string[]): boolean {
  return hasDmRole(roles) && !hasHrRole(roles);
}

/** Account manager portal user (not HR/admin). */
export function isAccountManagerPortalUser(roles: string[]): boolean {
  return hasAccountManagerRole(roles) && !hasHrRole(roles);
}

export function canViewEmployeeDirectory(roles: string[]): boolean {
  return hasHrRole(roles);
}

/** Account manager — Resumes sidebar tab. */
export function canViewEmployeeResumes(roles: string[]): boolean {
  return hasAccountManagerRole(roles);
}

/** HR directory + AM — GET /api/v1/employee-resume for share links. */
export function canFetchEmployeeResumeApi(roles: string[]): boolean {
  return hasHrRole(roles) || hasAccountManagerRole(roles);
}

export function canEditEmployeeDirectory(roles: string[]): boolean {
  return hasHrRole(roles);
}

/** PUT /employee-profile/{empId} — full profile (ROLE_HR). */
export function canEditEmployeeProfile(roles: string[]): boolean {
  return roles.includes("ROLE_HR");
}

/** PUT /employee-profile/{empId} — status field only (ROLE_ADMIN, not HR). */
export function canEditEmployeeProfileStatusOnly(roles: string[]): boolean {
  return roles.includes("ROLE_ADMIN") && !roles.includes("ROLE_HR");
}

export function canOpenEmployeeProfileEditor(roles: string[]): boolean {
  return canEditEmployeeProfile(roles) || canEditEmployeeProfileStatusOnly(roles);
}

/** Leave and comp-off from AM employees are reviewed by HR. */
export function isAccountManagerEmployeeUser(roles: string[]): boolean {
  return hasAccountManagerRole(roles) && roles.includes("ROLE_EMPLOYEE");
}
