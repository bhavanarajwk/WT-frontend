"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { AllocationExtensionPanel } from "@/components/dashboard/sections/AllocationExtensionPanel";

export function AllocationExtensionPageClient() {
  const { requiresSelfOnboarding } = useDashboardAccess();

  return (
    <DashboardPageShell>
      <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
        <AllocationExtensionPanel />
      </OnboardingGate>
    </DashboardPageShell>
  );
}
