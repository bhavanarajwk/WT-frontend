/** Path for each dashboard nav id (route-based; no ?tab=). */
export const DASHBOARD_ROUTES: Record<string, string> = {
  overview: "/dashboard/overview",
  employee: "/dashboard/employee",
  allocation: "/dashboard/allocation",
  "allocation-extension": "/dashboard/allocation-extension",
  offboarding: "/dashboard/offboarding",
  "background-verification": "/dashboard/background-verification",
  "employee-attendance": "/dashboard/employee-attendance",
  timelog: "/dashboard/timelog",
  leave: "/dashboard/leave",
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

export const DASHBOARD_DEFAULT_PATH = DASHBOARD_ROUTES.overview;

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
  { prefix: "/dashboard/employee", id: "employee" },
  { prefix: "/dashboard/allocation-extension", id: "allocation-extension" },
  { prefix: "/dashboard/allocation", id: "allocation" },
  { prefix: "/dashboard/offboarding", id: "offboarding" },
  { prefix: "/dashboard/background-verification", id: "background-verification" },
  { prefix: "/dashboard/employee-attendance", id: "employee-attendance" },
  { prefix: "/dashboard/timelog", id: "timelog" },
  { prefix: "/dashboard/leave", id: "leave" },
  { prefix: "/dashboard/uploads", id: "uploads" },
  { prefix: "/dashboard/masters", id: "masters" },
  { prefix: "/dashboard/profile", id: "profile" },
];

export function dashboardNavIdFromPathname(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return "overview";
  }
  for (const { prefix, id } of PATH_TO_NAV_ID) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return id;
    }
  }
  return "overview";
}

export function dashboardHref(navId: string): string {
  return DASHBOARD_ROUTES[navId] ?? DASHBOARD_DEFAULT_PATH;
}
