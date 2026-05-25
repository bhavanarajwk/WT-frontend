"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { EmployeeAttendancePanel } from "@/components/dashboard/sections/EmployeeAttendancePanel";

export function EmployeeAttendancePageClient() {
  const { requiresSelfOnboarding, hasHrAccess } = useDashboardAccess();

  return (
    <DashboardPageShell>
      <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
        {hasHrAccess ? <EmployeeAttendancePanel /> : null}
      </OnboardingGate>
    </DashboardPageShell>
  );
}
