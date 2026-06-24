"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { WebTrakBrand } from "@/components/shared/WebTrakBrand";
import { apiClient } from "@/api/httpClient";
import { endpoints } from "@/api/endpoints";
import { hrmsService } from "@/services/hrms.service";
import { toRows } from "@/utils/apiRows";
import {
  dashboardNavigation,
  filterNavigationForOffboardedUser,
  filterVisibleNavigation,
  dashboardPageTitle,
  getDashboardSectionLabel,
} from "@/constants/dashboardNavigation";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useExitInterviewProfile } from "@/hooks/exit-interview/useExitInterviewProfile";
import { shouldShowExitSurveyInNav } from "@/utils/exitInterview";
import { shouldSkipSelfProfileFetch } from "@/utils/selfProfile";
import { dashboardHref, DASHBOARD_ROUTES, isDashboardNavChildActive } from "@/constants/routes";
import { learningSubNav, LEARNING_BASE } from "@/constants/learningNav";
import { SidebarIcon } from "@/constants/sidebarIcons";
import { useDashboardNav } from "@/components/dashboard/DashboardNavContext";
import { Badge } from "@/components/ui/badge";
import { filledBadgeClass } from "@/components/dashboard/ui/badgeTones";
import {
  SIDEBAR_CHILD_BLOCK,
  SIDEBAR_CHILD_ICON_WRAP,
  SIDEBAR_CHILD_ROW,
  SIDEBAR_CHILD_TEXT,
  SIDEBAR_ICON_WRAP,
  SIDEBAR_NAV_LABEL,
  SIDEBAR_NAV_ROW,
  SIDEBAR_PARENT_TEXT,
} from "@/components/dashboard/ui/sidebarLayout";

const HEADER_ICON_BUTTON_CLASS =
  "flex cursor-pointer items-center justify-center rounded-lg border border-wt-border bg-wt-surface-1 p-2.5 text-wt-text shadow-sm transition hover:bg-wt-surface-2";

function IconUser({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5z" />
    </svg>
  );
}

function IconBell({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconMoon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function IconSun({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconLogout({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function extractRoleFromNotificationMessage(message: string): string {
  const pipeMatch = message.match(/\|\s*([^|]+?)\s+submitted/i);
  if (pipeMatch?.[1]) return pipeMatch[1].trim();
  const roleWordMatch = message.match(/\b(HR|Manager|Employee|Emp|Admin|Finance)\b/i);
  return roleWordMatch?.[1] ? roleWordMatch[1].trim() : "—";
}

function applyTheme(nextTheme: "light" | "dark") {
  document.documentElement.dataset.theme = nextTheme;
}

function readStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("wt-theme");
  if (stored === "dark") return "dark";
  if (stored === "light") return "light";
  if (stored === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function DashboardChrome({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const {
    activeSection,
    expandedSection,
    toggleExpandedSection,
  } = useDashboardNav();

  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = userRoles.includes("ROLE_MANAGER");
  const hasDmAccess = userRoles.includes("ROLE_DM");
  const hasAccountManagerAccess = userRoles.includes("ROLE_AM");
  const canAccessProfile = Boolean(user) && !shouldSkipSelfProfileFetch(userRoles);
  const isEmployeeDirectoryRoute = pathname.startsWith("/dashboard/employee-directory");
  const isEmployeeOnboardingRoute =
    pathname === DASHBOARD_ROUTES.employee ||
    pathname.startsWith("/dashboard/employee/assign-account-manager");
  const isAssignAccountManagerRoute = pathname.startsWith(
    "/dashboard/employee/assign-account-manager"
  );
  const isEmployeeProfileRoute = Boolean(pathname.match(/^\/dashboard\/employee-directory\/[^/]+$/));
  const isHrPortalUser =
    (userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN")) &&
    !userRoles.includes("ROLE_EMPLOYEE");
  const { isOffboarded } = useDashboardAccess();
  const shouldLoadExitInterviewProfile = useMemo(() => {
    if (!user) return false;
    if (pathname.startsWith(DASHBOARD_ROUTES["exit-interview"])) return true;
    if (isHrPortalUser) return false;
    return userRoles.includes("ROLE_EMPLOYEE");
  }, [user, pathname, isHrPortalUser, userRoles]);
  const exitProfileQ = useExitInterviewProfile({ enabled: shouldLoadExitInterviewProfile });
  const showExitSurveyNav = useMemo(() => {
    const flags = exitProfileQ.data?.flags;
    if (!flags) return false;
    return shouldShowExitSurveyInNav(flags);
  }, [exitProfileQ.data?.flags]);

  const navChildActiveOptions = useMemo(
    () => ({ hasHrAccess, hasManagerAccess, hasDmAccess }),
    [hasDmAccess, hasHrAccess, hasManagerAccess]
  );

  const isNavChildActive = useCallback(
    (childId: string) =>
      isDashboardNavChildActive(childId, activeSection, pathname, navChildActiveOptions),
    [activeSection, navChildActiveOptions, pathname]
  );

  const visibleNavigation = useMemo(() => {
    const base = filterVisibleNavigation(dashboardNavigation, userRoles, {
      hasHrAccess,
      hasAccountManagerAccess,
      showExitSurvey: showExitSurveyNav,
    });
    if (isOffboarded) {
      return filterNavigationForOffboardedUser(base, { showExitSurvey: showExitSurveyNav });
    }
    return base;
  }, [userRoles, hasHrAccess, hasAccountManagerAccess, isOffboarded, showExitSurveyNav]);

  const isExitSurveyRoute = pathname.startsWith(DASHBOARD_ROUTES["exit-interview"]);

  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);
  const [theme, setTheme] = useState<"light" | "dark">(readStoredTheme);
  const [actionLoading, setActionLoading] = useState(false);
  const notificationsPanelRef = useRef<HTMLDetailsElement>(null);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsPanelRef.current?.contains(target)) return;

      if (notificationsPanelRef.current?.open) {
        notificationsPanelRef.current.open = false;
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem("wt-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const loadNotifications = useCallback(async () => {
    if (isOffboarded) return;
    const res = await hrmsService.getNotifications({ page: "0", size: "20" });
    setNotifications(toRows(res.data));
  }, [isOffboarded]);

  const runAction = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await fn();
    } finally {
      setActionLoading(false);
    }
  }, []);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((row) => !Boolean(row.is_read ?? row.isRead ?? false)).length,
    [notifications]
  );

  const isLearningRoute = pathname.startsWith("/dashboard/learning-development");

  const pageTitle = useMemo(() => {
    if (isOffboarded && !isExitSurveyRoute && !isLearningRoute) {
      return "You Are Offboarded";
    }
    if (isLearningRoute) {
      return "Learning & Development";
    }
    if (pathname.includes("/dashboard/leave/team")) {
      return getDashboardSectionLabel("leave-team") ?? "Leave Requests";
    }
    return dashboardPageTitle(activeSection);
  }, [
    activeSection,
    hasDmAccess,
    hasHrAccess,
    hasManagerAccess,
    isExitSurveyRoute,
    isLearningRoute,
    isNavChildActive,
    isOffboarded,
    pathname,
  ]);

  const learningSectionTitle = useMemo(() => {
    const hit = learningSubNav.find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));
    return hit?.label ?? "Learning & Development";
  }, [pathname]);

  return (
    <div className="wt-page-scroll h-dvh overflow-y-auto text-wt-text">
      <div className="flex min-h-full max-lg:flex-col lg:flex-row">
      <aside className="sticky top-0 z-20 flex max-h-[min(36vh,260px)] shrink-0 flex-col overflow-x-hidden border-b border-wt-border bg-wt-surface-1 p-4 max-lg:relative max-lg:min-h-0 lg:h-dvh lg:max-h-dvh lg:w-[250px] lg:min-w-0 lg:border-b-0 lg:border-r lg:p-5">
        <div className="mb-4 min-w-0 shrink-0">
          <WebTrakBrand variant="sidebar" className="min-w-0" />
        </div>
        <nav className="min-h-0 min-w-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto">
          {visibleNavigation.map((item) => {
            if (item.kind === "group") {
              const isExpanded = expandedSection === item.id;
              const groupActive = item.children.some((child) => isNavChildActive(child.id));
              return (
                <div key={item.id} className="space-y-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`${SIDEBAR_NAV_ROW} ${SIDEBAR_PARENT_TEXT} ${
                      !isLearningRoute && groupActive
                        ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text"
                        : "text-wt-text-muted hover:bg-wt-surface-2"
                    }`}
                    onClick={() => toggleExpandedSection(item.id)}
                  >
                    <SidebarIcon name={item.icon} className={SIDEBAR_ICON_WRAP} />
                    <span className={SIDEBAR_NAV_LABEL}>{item.label}</span>
                    <SidebarIcon
                      name={isExpanded ? "chevronDown" : "chevronRight"}
                      className={`${SIDEBAR_ICON_WRAP} opacity-60`}
                    />
                  </Button>
                  {isExpanded ? (
                    <div className="ml-3 min-w-0 space-y-0.5 border-l border-wt-border pl-2">
                      {item.children.map((child) => (
                        <Link prefetch={false}
                          key={child.id}
                          href={dashboardHref(child.id)}
                          className={`${SIDEBAR_CHILD_ROW} ${SIDEBAR_CHILD_TEXT} ${
                            !isLearningRoute && isNavChildActive(child.id)
                              ? "bg-wt-surface-3 text-wt-text"
                              : "text-wt-text-muted hover:bg-wt-surface-2"
                          }`}
                        >
                          <SidebarIcon name={child.icon} className={SIDEBAR_CHILD_ICON_WRAP} />
                          <span className={SIDEBAR_NAV_LABEL}>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            if (item.kind === "expandable" && item.id === "reports") {
              const children = item.children;
              const isExpanded = expandedSection === "reports";
              const groupActive = activeSection.startsWith("reports-");
              return (
                <div key={item.id} className="space-y-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`${SIDEBAR_NAV_ROW} ${SIDEBAR_PARENT_TEXT} ${
                      !isLearningRoute && groupActive
                        ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text"
                        : "text-wt-text-muted hover:bg-wt-surface-2"
                    }`}
                    onClick={() => toggleExpandedSection("reports")}
                  >
                    <SidebarIcon name={item.icon} className={SIDEBAR_ICON_WRAP} />
                    <span className={SIDEBAR_NAV_LABEL}>{item.label}</span>
                    <SidebarIcon
                      name={isExpanded ? "chevronDown" : "chevronRight"}
                      className={`${SIDEBAR_ICON_WRAP} opacity-60`}
                    />
                  </Button>
                  {isExpanded ? (
                    <div className="ml-3 min-w-0 space-y-0.5 border-l border-wt-border pl-2">
                      {children.map((child) => (
                        <Link prefetch={false}
                          key={child.id}
                          href={dashboardHref(child.id)}
                          className={`${SIDEBAR_CHILD_BLOCK} ${SIDEBAR_CHILD_TEXT} ${
                            !isLearningRoute && activeSection === child.id
                              ? "bg-wt-surface-3 text-wt-text"
                              : "text-wt-text-muted hover:bg-wt-surface-2"
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            if (item.kind === "expandable" && item.id === "learning") {
              const isExpanded = expandedSection === "learning";
              return (
                <div key={item.id} className="space-y-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`${SIDEBAR_NAV_ROW} ${SIDEBAR_PARENT_TEXT} ${
                      isLearningRoute ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text" : "text-wt-text-muted hover:bg-wt-surface-2"
                    }`}
                    onClick={() => toggleExpandedSection("learning")}
                  >
                    <SidebarIcon name={item.icon} className={SIDEBAR_ICON_WRAP} />
                    <span className={SIDEBAR_NAV_LABEL}>{item.label}</span>
                    <SidebarIcon
                      name={isExpanded ? "chevronDown" : "chevronRight"}
                      className={`${SIDEBAR_ICON_WRAP} opacity-60`}
                    />
                  </Button>
                  {isExpanded ? (
                    <div className="ml-3 min-w-0 space-y-0.5 border-l border-wt-border pl-2">
                      {learningSubNav.map((link) => {
                        const active =
                          pathname === link.href ||
                          (link.href === LEARNING_BASE
                            ? pathname === LEARNING_BASE ||
                              pathname === `${LEARNING_BASE}/` ||
                              pathname.startsWith(`${LEARNING_BASE}/trainings`)
                            : pathname.startsWith(`${link.href}/`) || pathname.startsWith(link.href));
                        return (
                          <Link prefetch={false}
                            key={link.href}
                            href={link.href}
                            className={`${SIDEBAR_CHILD_BLOCK} ${SIDEBAR_CHILD_TEXT} ${
                              active ? "bg-wt-surface-3 text-wt-text" : "text-wt-text-muted hover:bg-wt-surface-2"
                            }`}
                          >
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            if (item.kind === "link") {
              return (
                <Link prefetch={false}
                  key={item.id}
                  href={dashboardHref(item.id)}
                  className={`${SIDEBAR_NAV_ROW} ${SIDEBAR_PARENT_TEXT} ${
                    !isLearningRoute && activeSection === item.id
                      ? "bg-wt-surface-3 text-wt-text"
                      : "text-wt-text-muted hover:bg-wt-surface-2"
                  }`}
                >
                  <SidebarIcon name={item.icon} className={SIDEBAR_ICON_WRAP} />
                  <span className={SIDEBAR_NAV_LABEL}>{item.label}</span>
                </Link>
              );
            }

            return null;
          })}
        </nav>
        {user ? (
          <div className="mt-4 shrink-0 border-t border-wt-border pt-4">
            <div className="flex items-center gap-2">
              {canAccessProfile && !isOffboarded ? (
                <Link
                  prefetch={false}
                  href={dashboardHref("profile")}
                  className={`${SIDEBAR_NAV_ROW} ${SIDEBAR_PARENT_TEXT} min-w-0 flex-1 cursor-pointer items-center rounded-xl border transition ${
                    activeSection === "profile"
                      ? "border-wt-border bg-wt-surface-3 text-wt-text"
                      : "border-transparent bg-wt-surface-2 text-wt-text-muted hover:bg-wt-surface-3 hover:text-wt-text"
                  }`}
                  aria-label="Profile"
                >
                  <IconUser className="shrink-0" />
                  <span className={SIDEBAR_NAV_LABEL}>Profile</span>
                </Link>
              ) : null}
              <button
                type="button"
                className="flex min-h-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-wt-border bg-wt-surface-2 px-2.5 py-2 text-wt-text-muted shadow-sm transition hover:bg-wt-surface-3 hover:text-wt-text"
                onClick={() => void logout()}
                aria-label="Logout"
              >
                <IconLogout />
              </button>
            </div>
          </div>
        ) : null}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-wt-page-bg">
        <header className="sticky top-0 z-10 shrink-0 bg-wt-surface-1 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{pageTitle}</h2>
            {isEmployeeDirectoryRoute && !isLearningRoute ? (
              <nav
                className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-wt-text-muted"
                aria-label="Breadcrumb"
              >
                <Link prefetch={false} href="/dashboard" className="hover:text-wt-text transition">
                  Dashboard
                </Link>
                <span aria-hidden>/</span>
                {isEmployeeProfileRoute ? (
                  <>
                    <Link
                      prefetch={false}
                      href={DASHBOARD_ROUTES["employee-directory"]}
                      className="hover:text-wt-text transition"
                    >
                      Employee Directory
                    </Link>
                    <span aria-hidden>/</span>
                    <span className="text-wt-text">Employee Profile</span>
                  </>
                ) : (
                  <span className="text-wt-text">Employee Directory</span>
                )}
              </nav>
            ) : isEmployeeOnboardingRoute && !isLearningRoute ? (
              <nav
                className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-wt-text-muted"
                aria-label="Breadcrumb"
              >
                <Link prefetch={false} href="/dashboard" className="hover:text-wt-text transition">
                  Dashboard
                </Link>
                <span aria-hidden>/</span>
                {isAssignAccountManagerRoute ? (
                  <>
                    <Link prefetch={false} href={DASHBOARD_ROUTES.employee} className="hover:text-wt-text transition">
                      Employee Onboarding
                    </Link>
                    <span aria-hidden>/</span>
                    <span className="text-wt-text">Assign</span>
                  </>
                ) : (
                  <span className="text-wt-text">Employee Onboarding</span>
                )}
              </nav>
            ) : isLearningRoute ? (
              <p className="text-xs text-wt-text-muted">{learningSectionTitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isOffboarded ? (
            <details
              ref={notificationsPanelRef}
              className="group relative"
              onToggle={(e) => {
                const el = e.currentTarget as HTMLDetailsElement;
                if (el.open) {
                  void loadNotifications().catch(() => setNotifications([]));
                }
              }}
            >
              <summary className={`relative cursor-pointer list-none ${HEADER_ICON_BUTTON_CLASS} [&::-webkit-details-marker]:hidden`}>
                <IconBell className="text-wt-text-muted" />
                {unreadNotificationCount ? (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                ) : null}
              </summary>
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,360px)] rounded-xl border border-wt-border bg-wt-surface-1 p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  <Button variant="ghost" size="xs" type="button" className="px-2.5 py-1.5 text-xs" onClick={() =>
                      runAction("Mark all notifications read", async () => {
                        await hrmsService.markAllNotificationsRead();
                        await loadNotifications();
                      })
                    }
                    disabled={actionLoading || !notifications.length}
                  >
                    Read All
                  </Button>
                </div>
                <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
                  {notifications.length ? (
                    notifications.map((row, idx) => {
                      const id = String(row.id ?? row.notification_id ?? row.notificationId ?? "").trim();
                      const isRead = Boolean(row.is_read ?? row.isRead ?? false);
                      const message = String(row.message ?? "").trim() || "—";
                      const roleLabel = extractRoleFromNotificationMessage(message);
                      return (
                        <div
                          key={id || `notification-${idx}`}
                          className="flex items-start justify-between gap-2 rounded-lg border border-wt-border bg-wt-surface-2 p-2.5"
                        >
                          <div className="min-w-0 space-y-1">
                            <Badge variant="secondary" className={`text-[10px] ${filledBadgeClass("neutral")}`}>
                              {roleLabel}
                            </Badge>
                            <p className={`text-sm break-words ${isRead ? "text-wt-text-muted" : "text-wt-text"}`}>
                              {message}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-md border border-wt-border text-wt-text-muted hover:bg-wt-surface-3 disabled:opacity-40"
                            disabled={actionLoading || isRead || !id}
                            onClick={() =>
                              runAction("Mark notification read", async () => {
                                await apiClient.put(endpoints.notifications.readById(id));
                                await loadNotifications();
                              })
                            }
                          >
                            <IconCheck />
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-wt-text-muted">No notifications.</p>
                  )}
                </div>
              </div>
            </details>
            ) : null}
            <button
              type="button"
              className={HEADER_ICON_BUTTON_CLASS}
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch To Light Mode" : "Switch To Dark Mode"}
            >
              {theme === "dark" ? (
                <IconSun className="text-wt-text-muted" />
              ) : (
                <IconMoon className="text-wt-text-muted" />
              )}
            </button>
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1 bg-wt-page-bg">{children}</div>
      </div>
      </div>
    </div>
  );
}
