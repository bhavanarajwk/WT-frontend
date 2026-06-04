"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { OffboardingPanel } from "@/components/dashboard/sections/OffboardingPanel";

export function OffboardingPageClient() {
  const { requiresSelfOnboarding, hasHrAccess } = useDashboardAccess();

  return (
    <DashboardPageShell>
      <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
        {hasHrAccess ? <OffboardingPanel /> : null}
      </OnboardingGate>
    </DashboardPageShell>
  );
}
