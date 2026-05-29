/** Path for each dashboard nav id (route-based; no ?tab=). */
export const DASHBOARD_ROUTES: Record<string, string> = {
  overview: "/dashboard/overview",
  "employee-directory": "/dashboard/employee-directory",
  resumes: "/dashboard/resumes",
  "employee-assign-am": "/dashboard/employee/assign-account-manager",
  employee: "/dashboard/employee",
  allocation: "/dashboard/allocation",
  "bench-forecast": "/dashboard/allocation/bench-forecast",
  "allocation-extension": "/dashboard/allocation-extension",
  offboarding: "/dashboard/offboarding",
  "background-verification": "/dashboard/background-verification",
  "employee-attendance": "/dashboard/employee-attendance",
  timelog: "/dashboard/timelog",
  "timelog-team": "/dashboard/timelog/team",
  leave: "/dashboard/leave",
  "leave-team": "/dashboard/leave/team",
  "comp-off": "/dashboard/comp-off",
  "comp-off-team": "/dashboard/comp-off/team",
  learning: "/dashboard/learning-development",
  "reports-workforce": "/dashboard/reports/workforce",
  "reports-section-2": "/dashboard/reports/utilization",
  "reports-section-3": "/dashboard/reports/attrition",
  "reports-section-4": "/dashboard/reports/skills",
  "reports-section-5": "/dashboard/reports/engagement",
  "reports-section-6": "/dashboard/reports/compliance",
  "reports-section-7": "/dashboard/reports/bgv-dashboard",
  uploads: "/dashboard/uploads",
  masters: "/dashboard/masters",
  profile: "/dashboard/profile",
};

export const DASHBOARD_DEFAULT_PATH = DASHBOARD_ROUTES["employee-directory"];

const PATH_TO_NAV_ID: Array<{ prefix: string; id: string }> = [
  { prefix: "/dashboard/learning-development", id: "learning" },
  { prefix: "/dashboard/reports/workforce", id: "reports-workforce" },
  { prefix: "/dashboard/reports/utilization", id: "reports-section-2" },
  { prefix: "/dashboard/reports/attrition", id: "reports-section-3" },
  { prefix: "/dashboard/reports/skills", id: "reports-section-4" },
  { prefix: "/dashboard/reports/engagement", id: "reports-section-5" },
  { prefix: "/dashboard/reports/compliance", id: "reports-section-6" },
  { prefix: "/dashboard/reports/bgv-dashboard", id: "reports-section-7" },
  { prefix: "/dashboard/overview", id: "overview" },
  { prefix: "/dashboard/employee-directory", id: "employee-directory" },
  { prefix: "/dashboard/resumes", id: "resumes" },
  { prefix: "/dashboard/employee/assign-account-manager", id: "employee" },
  { prefix: "/dashboard/employee", id: "employee" },
  { prefix: "/dashboard/allocation/bench-forecast", id: "bench-forecast" },
  { prefix: "/dashboard/allocation-extension", id: "allocation-extension" },
  { prefix: "/dashboard/allocation", id: "allocation" },
  { prefix: "/dashboard/offboarding", id: "offboarding" },
  { prefix: "/dashboard/background-verification", id: "background-verification" },
  { prefix: "/dashboard/employee-attendance", id: "employee-attendance" },
  { prefix: "/dashboard/timelog/team", id: "timelog-team" },
  { prefix: "/dashboard/timelog", id: "timelog" },
  { prefix: "/dashboard/leave/team", id: "leave-team" },
  { prefix: "/dashboard/leave", id: "leave" },
  { prefix: "/dashboard/comp-off/team", id: "comp-off-team" },
  { prefix: "/dashboard/comp-off", id: "comp-off" },
  { prefix: "/dashboard/uploads", id: "uploads" },
  { prefix: "/dashboard/masters", id: "masters" },
  { prefix: "/dashboard/profile", id: "profile" },
];

export function dashboardNavIdFromPathname(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return "employee-directory";
  }
  for (const { prefix, id } of PATH_TO_NAV_ID) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return id;
    }
  }
  return "employee-directory";
}

export function dashboardHref(navId: string): string {
  return DASHBOARD_ROUTES[navId] ?? DASHBOARD_DEFAULT_PATH;
}

export function employeeDirectoryProfilePath(empId: string): string {
  const id = encodeURIComponent(String(empId).trim());
  return `/dashboard/employee-directory/${id}`;
}

/** Landing route after login based on the user's roles. */
export function defaultDashboardPathForRoles(roles: string[]): string {
  const r = roles ?? [];
  if (r.includes("ROLE_HR") || r.includes("ROLE_ADMIN") || r.includes("ROLE_FINANCE")) {
    return DASHBOARD_ROUTES["employee-directory"];
  }
  if (r.includes("ROLE_AM") && !r.includes("ROLE_HR") && !r.includes("ROLE_ADMIN")) {
    return DASHBOARD_ROUTES.resumes;
  }
  if (r.includes("ROLE_MANAGER")) {
    return DASHBOARD_ROUTES.timelog;
  }
  if (r.includes("ROLE_EMPLOYEE")) {
    return DASHBOARD_ROUTES.profile;
  }
  return DASHBOARD_ROUTES["employee-directory"];
}
