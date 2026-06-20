"use client";

import { usePathname, useRouter } from "next/navigation";
import { PageTabs } from "@/components/dashboard/ui/PageTabs";
import { DASHBOARD_ROUTES } from "@/constants/routes";

const TABS = [{ href: DASHBOARD_ROUTES.employee, label: "Onboard Employees", exact: true }] as const;

export function EmployeeOnboardingSubNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeValue =
    TABS.find((tab) =>
      tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
    )?.href ?? TABS[0].href;

  return (
    <PageTabs
      embedded
      aria-label="Onboard employees"
      className="mb-0"
      value={activeValue}
      onValueChange={(value) => router.push(value)}
      items={TABS.map((tab) => ({
        value: tab.href,
        label: tab.label,
      }))}
    />
  );
}
