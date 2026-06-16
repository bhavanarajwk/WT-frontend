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

/** PUT /employee-profile/{empId} — ROLE_HR only (not admin-only). */
export function canEditEmployeeProfile(roles: string[]): boolean {
  return roles.includes("ROLE_HR");
}

/** Leave and comp-off from AM employees are reviewed by HR. */
export function isAccountManagerEmployeeUser(roles: string[]): boolean {
  return hasAccountManagerRole(roles) && roles.includes("ROLE_EMPLOYEE");
}
