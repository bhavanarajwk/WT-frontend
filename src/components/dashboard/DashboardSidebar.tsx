"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WebTrakBrand } from "@/components/shared/WebTrakBrand";
import { dashboardHref } from "@/constants/routes";
import { learningSubNav, LEARNING_BASE } from "@/constants/learningNav";
import type { NavItem, AccordionSectionId } from "@/constants/dashboardNavigation";
import { SidebarIcon } from "@/constants/sidebarIcons";
import { UserAvatar } from "@/components/dashboard/ui/profile";
import {
  SIDEBAR_CHILD_ICON_WRAP,
  SIDEBAR_COLLAPSE_TOGGLE_CLASS,
  SIDEBAR_FLYOUT_CLASS,
  SIDEBAR_FLYOUT_TITLE_CLASS,
  SIDEBAR_FOOTER_CLASS,
  SIDEBAR_GROUP_STACK_CLASS,
  SIDEBAR_ICON_WRAP,
  SIDEBAR_NAV_CLASS,
  sidebarBrandWrapClass,
  sidebarBrandRowClass,
  sidebarChildBlockClass,
  sidebarChildNavClass,
  sidebarChildrenWrapClass,
  sidebarFooterCardClass,
  sidebarFooterRowClass,
  sidebarLogoutButtonClass,
  sidebarNavLabelClass,
  sidebarParentNavClass,
  sidebarProfileLinkClass,
  sidebarShellClass,
  sidebarShellStateClass,
  SIDEBAR_BACKDROP_CLASS,
  SIDEBAR_SHELL_BASE,
} from "@/components/dashboard/ui/sidebarLayout";

function IconChevronLeft({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m9 18 6-6-6-6" />
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

function SidebarNavGroup({
  className,
  children,
}: {
  className?: string;
  children: (anchorRef: RefObject<HTMLDivElement | null>) => ReactNode;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={anchorRef} className={className}>
      {children(anchorRef)}
    </div>
  );
}

function SidebarFlyout({
  title,
  open,
  anchorRef,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchorRef, open, onClose]);

  if (!open) return null;

  return (
    <div ref={panelRef} className={SIDEBAR_FLYOUT_CLASS} role="menu" aria-label={title}>
      <p className={SIDEBAR_FLYOUT_TITLE_CLASS}>{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

type DashboardSidebarProps = {
  visibleNavigation: NavItem[];
  activeSection: string;
  expandedSection: AccordionSectionId | null;
  toggleExpandedSection: (section: AccordionSectionId) => void;
  isLearningRoute: boolean;
  isNavChildActive: (childId: string) => boolean;
  mobileNavOpen: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  closeMobileNav: () => void;
  user: { name?: string | null; email?: string | null } | null;
  profile: { name?: string | null } | null | undefined;
  sidebarDisplayName: string;
  canAccessProfile: boolean;
  isOffboarded: boolean;
  onLogout: () => void | Promise<void>;
};

export function DashboardSidebar({
  visibleNavigation,
  activeSection,
  expandedSection,
  toggleExpandedSection,
  isLearningRoute,
  isNavChildActive,
  mobileNavOpen,
  collapsed,
  onToggleCollapsed,
  closeMobileNav,
  user,
  profile,
  sidebarDisplayName,
  canAccessProfile,
  isOffboarded,
  onLogout,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [flyoutId, setFlyoutId] = useState<AccordionSectionId | null>(null);
  const showCollapsed = collapsed && !mobileNavOpen;

  const closeFlyout = useCallback(() => setFlyoutId(null), []);

  useEffect(() => {
    setFlyoutId(null);
  }, [pathname, collapsed]);

  const handleGroupToggle = (id: AccordionSectionId) => {
    if (showCollapsed) {
      setFlyoutId((current) => (current === id ? null : id));
      return;
    }
    toggleExpandedSection(id);
  };

  const renderFlyoutChild = (child: { id: string; label: string }, active: boolean) => (
    <Link
      prefetch={false}
      key={child.id}
      href={dashboardHref(child.id)}
      onClick={() => {
        closeFlyout();
        closeMobileNav();
      }}
      className={sidebarChildBlockClass(active)}
      role="menuitem"
    >
      {child.label}
    </Link>
  );

  return (
    <>
      {mobileNavOpen ? (
        <button
          type="button"
          className={SIDEBAR_BACKDROP_CLASS}
          aria-label="Close navigation"
          onClick={closeMobileNav}
        />
      ) : null}
      <aside className={cn(sidebarShellClass(mobileNavOpen, collapsed), "max-lg:w-[min(88vw,280px)]")}>
        <div className={sidebarBrandWrapClass(showCollapsed)}>
          <div className={sidebarBrandRowClass(showCollapsed)}>
            {showCollapsed ? (
              <div className="flex w-full flex-col items-center gap-2 lg:gap-2.5">
                <WebTrakBrand variant="sidebar" compact className="w-full" />
                <button
                  type="button"
                  className={SIDEBAR_COLLAPSE_TOGGLE_CLASS}
                  onClick={onToggleCollapsed}
                  aria-label="Expand sidebar"
                  aria-expanded={false}
                >
                  <IconChevronRight className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <WebTrakBrand variant="sidebar" className="min-w-0 flex-1" />
                <button
                  type="button"
                  className={SIDEBAR_COLLAPSE_TOGGLE_CLASS}
                  onClick={onToggleCollapsed}
                  aria-label="Collapse sidebar"
                  aria-expanded
                >
                  <IconChevronLeft className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <nav className={SIDEBAR_NAV_CLASS} aria-label="Main navigation">
          {visibleNavigation.map((item) => {
            if (item.kind === "group") {
              const isExpanded = expandedSection === item.id;
              const groupActive = item.children.some((child) => isNavChildActive(child.id));
              return (
                <SidebarNavGroup key={item.id} className={cn(SIDEBAR_GROUP_STACK_CLASS, "relative")}>
                  {(anchorRef) => (
                    <>
                  <button
                    type="button"
                    title={showCollapsed ? item.label : undefined}
                    className={sidebarParentNavClass(!isLearningRoute && groupActive, {
                      collapsed: showCollapsed,
                      extra: "cursor-pointer justify-start",
                    })}
                    onClick={() => handleGroupToggle(item.id)}
                    aria-expanded={showCollapsed ? flyoutId === item.id : isExpanded}
                  >
                    <SidebarIcon name={item.icon} className={SIDEBAR_ICON_WRAP} />
                    <span className={sidebarNavLabelClass(showCollapsed)}>{item.label}</span>
                    {!showCollapsed ? (
                      <SidebarIcon
                        name={isExpanded ? "chevronDown" : "chevronRight"}
                        className={cn(SIDEBAR_ICON_WRAP, "ml-auto opacity-60")}
                      />
                    ) : null}
                  </button>
                  {showCollapsed ? (
                    <SidebarFlyout
                      title={item.label}
                      open={flyoutId === item.id}
                      anchorRef={anchorRef}
                      onClose={closeFlyout}
                    >
                      {item.children.map((child) =>
                        renderFlyoutChild(child, !isLearningRoute && isNavChildActive(child.id))
                      )}
                    </SidebarFlyout>
                  ) : isExpanded ? (
                    <div className={sidebarChildrenWrapClass(showCollapsed)}>
                      {item.children.map((child) => (
                        <Link
                          prefetch={false}
                          key={child.id}
                          href={dashboardHref(child.id)}
                          onClick={closeMobileNav}
                          className={sidebarChildNavClass(!isLearningRoute && isNavChildActive(child.id), {
                            collapsed: showCollapsed,
                          })}
                        >
                          <SidebarIcon name={child.icon} className={SIDEBAR_CHILD_ICON_WRAP} />
                          <span className={sidebarNavLabelClass(showCollapsed)}>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                    </>
                  )}
                </SidebarNavGroup>
              );
            }

            if (item.kind === "expandable" && item.id === "reports") {
              const children = item.children;
              const isExpanded = expandedSection === "reports";
              const groupActive = activeSection.startsWith("reports-");
              return (
                <SidebarNavGroup key={item.id} className={cn(SIDEBAR_GROUP_STACK_CLASS, "relative")}>
                  {(anchorRef) => (
                    <>
                  <button
                    type="button"
                    title={showCollapsed ? item.label : undefined}
                    className={sidebarParentNavClass(!isLearningRoute && groupActive, {
                      collapsed: showCollapsed,
                      extra: "cursor-pointer justify-start",
                    })}
                    onClick={() => handleGroupToggle("reports")}
                    aria-expanded={showCollapsed ? flyoutId === "reports" : isExpanded}
                  >
                    <SidebarIcon name={item.icon} className={SIDEBAR_ICON_WRAP} />
                    <span className={sidebarNavLabelClass(showCollapsed)}>{item.label}</span>
                    {!showCollapsed ? (
                      <SidebarIcon
                        name={isExpanded ? "chevronDown" : "chevronRight"}
                        className={cn(SIDEBAR_ICON_WRAP, "ml-auto opacity-60")}
                      />
                    ) : null}
                  </button>
                  {showCollapsed ? (
                    <SidebarFlyout
                      title={item.label}
                      open={flyoutId === "reports"}
                      anchorRef={anchorRef}
                      onClose={closeFlyout}
                    >
                      {children.map((child) =>
                        renderFlyoutChild(child, !isLearningRoute && activeSection === child.id)
                      )}
                    </SidebarFlyout>
                  ) : isExpanded ? (
                    <div className={sidebarChildrenWrapClass(showCollapsed)}>
                      {children.map((child) => (
                        <Link
                          prefetch={false}
                          key={child.id}
                          href={dashboardHref(child.id)}
                          onClick={closeMobileNav}
                          className={sidebarChildBlockClass(!isLearningRoute && activeSection === child.id)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                    </>
                  )}
                </SidebarNavGroup>
              );
            }

            if (item.kind === "expandable" && item.id === "learning") {
              const isExpanded = expandedSection === "learning";
              return (
                <SidebarNavGroup key={item.id} className={cn(SIDEBAR_GROUP_STACK_CLASS, "relative")}>
                  {(anchorRef) => (
                    <>
                  <button
                    type="button"
                    title={showCollapsed ? item.label : undefined}
                    className={sidebarParentNavClass(isLearningRoute, {
                      collapsed: showCollapsed,
                      extra: "cursor-pointer justify-start",
                    })}
                    onClick={() => handleGroupToggle("learning")}
                    aria-expanded={showCollapsed ? flyoutId === "learning" : isExpanded}
                  >
                    <SidebarIcon name={item.icon} className={SIDEBAR_ICON_WRAP} />
                    <span className={sidebarNavLabelClass(showCollapsed)}>{item.label}</span>
                    {!showCollapsed ? (
                      <SidebarIcon
                        name={isExpanded ? "chevronDown" : "chevronRight"}
                        className={cn(SIDEBAR_ICON_WRAP, "ml-auto opacity-60")}
                      />
                    ) : null}
                  </button>
                  {showCollapsed ? (
                    <SidebarFlyout
                      title={item.label}
                      open={flyoutId === "learning"}
                      anchorRef={anchorRef}
                      onClose={closeFlyout}
                    >
                      {learningSubNav.map((link) => {
                        const active =
                          pathname === link.href ||
                          (link.href === LEARNING_BASE
                            ? pathname === LEARNING_BASE ||
                              pathname === `${LEARNING_BASE}/` ||
                              pathname.startsWith(`${LEARNING_BASE}/trainings`)
                            : pathname.startsWith(`${link.href}/`) || pathname.startsWith(link.href));
                        return (
                          <Link
                            prefetch={false}
                            key={link.href}
                            href={link.href}
                            onClick={() => {
                              closeFlyout();
                              closeMobileNav();
                            }}
                            className={sidebarChildBlockClass(active)}
                            role="menuitem"
                          >
                            {link.label}
                          </Link>
                        );
                      })}
                    </SidebarFlyout>
                  ) : isExpanded ? (
                    <div className={sidebarChildrenWrapClass(showCollapsed)}>
                      {learningSubNav.map((link) => {
                        const active =
                          pathname === link.href ||
                          (link.href === LEARNING_BASE
                            ? pathname === LEARNING_BASE ||
                              pathname === `${LEARNING_BASE}/` ||
                              pathname.startsWith(`${LEARNING_BASE}/trainings`)
                            : pathname.startsWith(`${link.href}/`) || pathname.startsWith(link.href));
                        return (
                          <Link
                            prefetch={false}
                            key={link.href}
                            href={link.href}
                            onClick={closeMobileNav}
                            className={sidebarChildBlockClass(active)}
                          >
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                    </>
                  )}
                </SidebarNavGroup>
              );
            }

            if (item.kind === "link") {
              return (
                <Link
                  prefetch={false}
                  key={item.id}
                  href={dashboardHref(item.id)}
                  title={showCollapsed ? item.label : undefined}
                  onClick={closeMobileNav}
                  className={sidebarParentNavClass(!isLearningRoute && activeSection === item.id, {
                    collapsed: showCollapsed,
                  })}
                >
                  <SidebarIcon name={item.icon} className={SIDEBAR_ICON_WRAP} />
                  <span className={sidebarNavLabelClass(showCollapsed)}>{item.label}</span>
                </Link>
              );
            }

            return null;
          })}
        </nav>

        {user ? (
          <div className={SIDEBAR_FOOTER_CLASS}>
            <div className={sidebarFooterCardClass(showCollapsed)}>
              <div className={sidebarFooterRowClass(showCollapsed)}>
                {canAccessProfile && !isOffboarded ? (
                  <Link
                    prefetch={false}
                    href={dashboardHref("profile")}
                    title={showCollapsed ? sidebarDisplayName : undefined}
                    className={sidebarProfileLinkClass(activeSection === "profile", showCollapsed)}
                    aria-label={`View profile for ${sidebarDisplayName}`}
                    onClick={closeMobileNav}
                  >
                    <UserAvatar profile={profile} fallbackName={user?.name ?? user?.email} size="sm" />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm font-medium leading-snug",
                        showCollapsed &&
                          "lg:pointer-events-none lg:absolute lg:-m-px lg:h-px lg:w-px lg:overflow-hidden lg:whitespace-nowrap lg:border-0 lg:p-0"
                      )}
                    >
                      {sidebarDisplayName}
                    </span>
                  </Link>
                ) : null}
                <button
                  type="button"
                  title="Logout"
                  className={sidebarLogoutButtonClass(showCollapsed)}
                  onClick={() => void onLogout()}
                  aria-label="Logout"
                >
                  <IconLogout />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export { sidebarShellStateClass, SIDEBAR_SHELL_BASE };
