export function hasHrRole(roles: string[]): boolean {
  return roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");
}

export function hasAccountManagerRole(roles: string[]): boolean {
  return roles.includes("ROLE_AM");
}

export function hasManagerRole(roles: string[]): boolean {
  return roles.includes("ROLE_MANAGER");
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

/** Leave and comp-off from AM employees are reviewed by HR. */
export function isAccountManagerEmployeeUser(roles: string[]): boolean {
  return hasAccountManagerRole(roles) && roles.includes("ROLE_EMPLOYEE");
}
