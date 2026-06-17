export function hasHrRole(roles: string[]): boolean {
  return roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");
}

export function hasAccountManagerRole(roles: string[]): boolean {
  return roles.includes("ROLE_AM");
}

export function hasManagerRole(roles: string[]): boolean {
  return roles.includes("ROLE_MANAGER");
}

export function hasDmRole(roles: string[]): boolean {
  return roles.includes("ROLE_DM");
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
