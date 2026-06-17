import type { SidebarIconName } from "@/constants/sidebarIcons";

export type NavChild = {
  id: string;
  label: string;
  roles: string[];
  icon: SidebarIconName;
};

export type NavGroup = {
  kind: "group";
  id: "employee" | "projects" | "personal";
  label: string;
  icon: SidebarIconName;
  children: NavChild[];
};

export type NavLink = {
  kind: "link";
  id: string;
  label: string;
  roles: string[];
  icon: SidebarIconName;
};

export type NavExpandable = {
  kind: "expandable";
  id: string;
  label: string;
  roles: string[];
  icon: SidebarIconName;
  children: Array<{ id: string; label: string; icon?: SidebarIconName }>;
};

export type NavItem = NavGroup | NavLink | NavExpandable;

export const dashboardNavigation: NavItem[] = [
  {
    kind: "group",
    id: "employee",
    label: "Employee",
    icon: "users",
    children: [
      {
        id: "employee",
        label: "Onboarding",
        roles: ["ROLE_EMPLOYEE", "ROLE_HR", "ROLE_ADMIN"],
        icon: "userPlus",
      },
      {
        id: "employee-directory",
        label: "Directory",
        roles: ["ROLE_HR", "ROLE_ADMIN"],
        icon: "bookUser",
      },
      {
        id: "employee-attendance",
        label: "Employee Attendance And Leave Summary",
        roles: ["ROLE_HR", "ROLE_ADMIN"],
        icon: "calendarCheck",
      },
      {
        id: "holiday-calendars",
        label: "Holiday Calendar",
        roles: ["ROLE_HR", "ROLE_ADMIN"],
        icon: "calendarDays",
      },
      {
        id: "offboarding",
        label: "Offboarding",
        roles: ["ROLE_HR"],
        icon: "userMinus",
      },
      {
        id: "exit-interview-submissions",
        label: "Exit Survey",
        roles: ["ROLE_HR", "ROLE_ADMIN"],
        icon: "fileText",
      },
      {
        id: "leave-team",
        label: "Leave Requests",
        roles: ["ROLE_MANAGER", "ROLE_DM", "ROLE_HR", "ROLE_ADMIN"],
        icon: "calendarDays",
      },
      {
        id: "timelog-team",
        label: "Timelogs",
        roles: ["ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"],
        icon: "clock",
      },
    ],
  },
  {
    kind: "group",
    id: "projects",
    label: "Projects",
    icon: "folder",
    children: [
      {
        id: "allocation",
        label: "Projects Allocation",
        roles: ["ROLE_HR", "ROLE_ADMIN"],
        icon: "layoutGrid",
      },
      {
        id: "allocation-extension",
        label: "Allocation Extension",
        roles: ["ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"],
        icon: "calendarRange",
      },
      {
        id: "talent-pool",
        label: "Talent Pool",
        roles: ["ROLE_HR", "ROLE_ADMIN"],
        icon: "users",
      },
    ],
  },
  {
    kind: "group",
    id: "personal",
    label: "Personal",
    icon: "user",
    children: [
      {
        id: "timelog",
        label: "Timelogs",
        roles: ["ROLE_EMPLOYEE", "ROLE_AM", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"],
        icon: "clock",
      },
      {
        id: "leave",
        label: "Leave Request",
        roles: ["ROLE_EMPLOYEE", "ROLE_AM", "ROLE_MANAGER", "ROLE_DM", "ROLE_HR", "ROLE_ADMIN"],
        icon: "calendarDays",
      },
      {
        id: "annual-calendar",
        label: "Annual Calendar",
        roles: [
          "ROLE_EMPLOYEE",
          "ROLE_MANAGER",
          "ROLE_HR",
          "ROLE_ADMIN",
          "ROLE_FINANCE",
          "ROLE_AM",
        ],
        icon: "calendarDays",
      },
      {
        id: "exit-interview",
        label: "Exit Survey",
        roles: ["ROLE_EMPLOYEE", "ROLE_AM", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"],
        icon: "fileText",
      },
    ],
  },
  { kind: "link", id: "resumes", label: "Resumes", roles: ["ROLE_AM"], icon: "fileText" },
  {
    kind: "link",
    id: "background-verification",
    label: "Background Verification",
    roles: ["ROLE_HR"],
    icon: "shield",
  },
  {
    kind: "expandable",
    id: "learning",
    label: "Learning & Development",
    roles: ["ROLE_EMPLOYEE", "ROLE_AM", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"],
    icon: "graduationCap",
    children: [],
  },
  {
    kind: "expandable",
    id: "reports",
    label: "Reports",
    roles: ["ROLE_HR", "ROLE_ADMIN"],
    icon: "barChart",
    children: [
      { id: "reports-workforce", label: "Workforce Overview" },
      { id: "reports-section-2", label: "Utilization vs Effort" },
      { id: "reports-bench", label: "Bench" },
      { id: "reports-section-3", label: "Attrition & Retention" },
      { id: "reports-section-4", label: "Skill & Capacity Report" },
      { id: "reports-section-5", label: "Engagement & Culture Metrics" },
      { id: "reports-section-6", label: "Compliance & Risk Support Report" },
      { id: "reports-section-7", label: "BGV Report Dashboard" },
    ],
  },
  { kind: "link", id: "uploads", label: "Uploads", roles: ["ROLE_HR", "ROLE_ADMIN"], icon: "upload" },
  { kind: "link", id: "masters", label: "Masters & Admin", roles: ["ROLE_HR", "ROLE_ADMIN"], icon: "settings" },
];

function childVisible(
  child: NavChild,
  userRoles: string[],
  options: { hasHrAccess: boolean }
): boolean {
  if (child.id === "employee" && !options.hasHrAccess) return false;
  return child.roles.length === 0 ? true : child.roles.some((r) => userRoles.includes(r));
}

export function filterVisibleNavigation(
  items: NavItem[],
  userRoles: string[],
  options: { hasHrAccess: boolean; hasAccountManagerAccess?: boolean; showExitSurvey?: boolean }
): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    if (item.kind === "group") {
      const children = item.children.filter((child) => {
        if (child.id === "exit-interview" && !options.showExitSurvey) return false;
        return childVisible(child, userRoles, options);
      });
      if (children.length) result.push({ ...item, children });
      continue;
    }

    if (item.kind === "link" || item.kind === "expandable") {
      if (item.id === "employee" && !options.hasHrAccess) continue;
      if (item.roles.length === 0 ? false : !item.roles.some((r) => userRoles.includes(r))) continue;
      result.push(item);
    }
  }
  return result;
}

/** Offboarded employees may only open Exit survey under Personal (during notice only). */
export function filterNavigationForOffboardedUser(
  _items: NavItem[],
  options?: { showExitSurvey?: boolean }
): NavItem[] {
  if (!options?.showExitSurvey) return [];
  const personal = dashboardNavigation.find(
    (item) => item.kind === "group" && item.id === "personal"
  );
  if (!personal || personal.kind !== "group") return [];
  const exitSurvey = personal.children.find((child) => child.id === "exit-interview");
  if (!exitSurvey) return [];
  return [{ ...personal, children: [exitSurvey] }];
}

export function getDashboardSectionLabel(sectionId: string): string | undefined {
  for (const item of dashboardNavigation) {
    if (item.kind === "group") {
      const hit = item.children.find((child) => child.id === sectionId);
      if (hit) return hit.label;
      continue;
    }
    if (item.kind === "link" && item.id === sectionId) {
      return item.label;
    }
    if (item.kind === "expandable") {
      if (item.id === sectionId) return item.label;
      const hit = item.children.find((child) => child.id === sectionId);
      if (hit) return hit.label;
    }
  }
  return undefined;
}

/** Map nav id to sidebar group id for accordion auto-expand. */
export function navGroupForSection(sectionId: string): "employee" | "projects" | "personal" | null {
  for (const item of dashboardNavigation) {
    if (item.kind !== "group") continue;
    if (item.children.some((child) => child.id === sectionId)) return item.id;
  }
  return null;
}

/** Expandable sections that participate in the accordion (groups + reports + learning). */
export type AccordionSectionId = "employee" | "projects" | "personal" | "reports" | "learning";

export function accordionSectionForPathname(pathname: string, activeSection: string): AccordionSectionId | null {
  const group = navGroupForSection(activeSection);
  if (group) return group;
  if (activeSection.startsWith("reports-")) return "reports";
  if (pathname.startsWith("/dashboard/learning-development")) return "learning";
  return null;
}

const PAGE_TITLE_OVERRIDES: Record<string, string> = {
  profile: "Profile",
  overview: "Overview",
};

function toTitleCase(label: string): string {
  return label
    .split(/\s+/)
    .map((word) => {
      if (word === "&") return word;
      const lower = word.toLowerCase();
      if (lower === "vs") return "vs";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function groupChildPageTitle(groupLabel: string, childLabel: string): string {
  if (childLabel.toLowerCase().startsWith(groupLabel.toLowerCase())) {
    return toTitleCase(childLabel);
  }
  return `${groupLabel} ${toTitleCase(childLabel)}`;
}

/** Page header title for the active dashboard section. */
export function dashboardPageTitle(sectionId: string): string {
  if (PAGE_TITLE_OVERRIDES[sectionId]) {
    return PAGE_TITLE_OVERRIDES[sectionId];
  }

  for (const item of dashboardNavigation) {
    if (item.kind === "group") {
      const child = item.children.find((c) => c.id === sectionId);
      if (child) return groupChildPageTitle(item.label, child.label);
    }
    if (item.kind === "link" && item.id === sectionId) {
      return item.label;
    }
    if (item.kind === "expandable") {
      if (item.id === sectionId) return item.label;
      const child = item.children.find((c) => c.id === sectionId);
      if (child) return child.label;
    }
  }

  return toTitleCase(sectionId.replace(/-/g, " "));
}
