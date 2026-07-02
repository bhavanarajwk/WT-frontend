"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { hrmsService, type NotificationItem } from "@/services/hrms.service";
import {
  formatNotificationTimestamp,
  notificationIsRead,
  notificationMessage,
  notificationRowId,
  notificationTitle,
  parseNotificationItems,
} from "@/utils/notifications";
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
import { learningSubNav } from "@/constants/learningNav";
import { useDashboardNav } from "@/components/dashboard/DashboardNavContext";
import { Badge } from "@/components/ui/badge";
import { filledBadgeClass } from "@/components/dashboard/ui/badgeTones";
import { applyResolvedTheme, readStoredTheme } from "@/utils/dashboard/theme";
import { readSidebarCollapsed, writeSidebarCollapsed } from "@/utils/dashboard/sidebarPrefs";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import {
  DASHBOARD_HEADER_CLASS,
  DASHBOARD_HEADER_MENU_BUTTON_CLASS,
} from "@/components/dashboard/ui/sidebarLayout";

const HEADER_ICON_BUTTON_CLASS =
  "flex cursor-pointer items-center justify-center rounded-lg border border-wt-border bg-wt-surface-1 p-2.5 text-wt-text shadow-sm transition hover:bg-wt-surface-2";

function IconMenu({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
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

function extractRoleFromNotificationMessage(message: string): string {
  const pipeMatch = message.match(/\|\s*([^|]+?)\s+submitted/i);
  if (pipeMatch?.[1]) return pipeMatch[1].trim();
  const roleWordMatch = message.match(/\b(HR|Manager|Employee|Emp|Admin|Finance)\b/i);
  return roleWordMatch?.[1] ? roleWordMatch[1].trim() : "—";
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
  const isEmployeeProfileRoute = Boolean(pathname.match(/^\/dashboard\/employee-directory\/[^/]+$/));
  const isHrPortalUser =
    (userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN")) &&
    !userRoles.includes("ROLE_EMPLOYEE");
  const { isOffboarded, profile } = useDashboardAccess();
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

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(readStoredTheme);
  const [actionLoading, setActionLoading] = useState(false);
  const notificationsPanelRef = useRef<HTMLDetailsElement>(null);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current;
      writeSidebarCollapsed(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setSidebarCollapsed(readSidebarCollapsed());
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
    applyResolvedTheme(theme);
    try {
      window.localStorage.setItem("wt-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const loadNotifications = useCallback(async () => {
    if (isOffboarded) return;
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const res = await hrmsService.getNotifications({ page: "0", size: "20" });
      setNotifications(parseNotificationItems(res.data ?? res));
    } catch (error) {
      setNotifications([]);
      setNotificationsError(
        error instanceof Error ? error.message : "Could not load notifications."
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, [isOffboarded]);

  useEffect(() => {
    if (isOffboarded) return;
    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);
    const onFocus = () => {
      void loadNotifications();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [isOffboarded, loadNotifications]);

  const runAction = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await fn();
    } finally {
      setActionLoading(false);
    }
  }, []);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((row) => !notificationIsRead(row)).length,
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

  const sidebarDisplayName = useMemo(() => {
    const name = String(profile?.name ?? user?.name ?? user?.email ?? "").trim();
    return name || "Profile";
  }, [profile?.name, user?.email, user?.name]);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    setMobileNavOpen(false);
    if (notificationsPanelRef.current?.open) {
      notificationsPanelRef.current.open = false;
    }
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="flex h-dvh overflow-hidden text-wt-text">
      <DashboardSidebar
        visibleNavigation={visibleNavigation}
        activeSection={activeSection}
        expandedSection={expandedSection}
        toggleExpandedSection={toggleExpandedSection}
        isLearningRoute={isLearningRoute}
        isNavChildActive={isNavChildActive}
        mobileNavOpen={mobileNavOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        closeMobileNav={closeMobileNav}
        user={user}
        profile={profile}
        sidebarDisplayName={sidebarDisplayName}
        canAccessProfile={canAccessProfile}
        isOffboarded={isOffboarded}
        onLogout={logout}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-wt-page-bg">
        <header className={DASHBOARD_HEADER_CLASS}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              className={DASHBOARD_HEADER_MENU_BUTTON_CLASS}
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <IconMenu />
            </button>
            <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-wt-text sm:text-xl">{pageTitle}</h2>
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
            ) : isLearningRoute ? (
              <p className="text-xs text-wt-text-muted">{learningSectionTitle}</p>
            ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
                  {notificationsLoading && !notifications.length ? (
                    <p className="text-sm text-wt-text-muted">Loading notifications…</p>
                  ) : notificationsError ? (
                    <p className="text-sm text-rose-400">{notificationsError}</p>
                  ) : notifications.length ? (
                    notifications.map((row, idx) => {
                      const id = notificationRowId(row);
                      const isRead = notificationIsRead(row);
                      const title = notificationTitle(row);
                      const message = notificationMessage(row);
                      const createdAt = formatNotificationTimestamp(row.created_at);
                      const roleLabel = extractRoleFromNotificationMessage(message);
                      return (
                        <div
                          key={id || `notification-${idx}`}
                          className={cn(
                            "flex items-start justify-between gap-2 rounded-lg border border-wt-border p-2.5",
                            isRead ? "bg-wt-surface-2/60" : "bg-wt-surface-2"
                          )}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className={`text-[10px] ${filledBadgeClass("neutral")}`}>
                                {roleLabel}
                              </Badge>
                              {createdAt ? (
                                <span className="text-[10px] text-wt-text-faint">{createdAt}</span>
                              ) : null}
                            </div>
                            {title && title !== message ? (
                              <p className={`text-sm font-medium ${isRead ? "text-wt-text-muted" : "text-wt-text"}`}>
                                {title}
                              </p>
                            ) : null}
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
                                await hrmsService.markNotificationRead(id);
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

        <div className="wt-page-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-wt-page-bg">
          {children}
        </div>
      </div>
    </div>
  );
}
