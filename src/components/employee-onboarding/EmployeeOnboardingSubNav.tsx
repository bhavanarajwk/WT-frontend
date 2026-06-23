"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_ROUTES } from "@/constants/routes";

const TABS = [{ href: DASHBOARD_ROUTES.employee, label: "Onboard Employees", exact: true }] as const;

export function EmployeeOnboardingSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-5 flex gap-1 overflow-x-auto border-b border-wt-border"
      aria-label="Onboard employees"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 border-b-2 px-4 pb-3 pt-2 text-sm font-medium transition -mb-px ${
              active
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-wt-text-muted hover:text-wt-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
