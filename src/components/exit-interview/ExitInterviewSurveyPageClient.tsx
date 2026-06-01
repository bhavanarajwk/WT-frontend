"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { ExitInterviewSurveyPanel } from "@/components/exit-interview/ExitInterviewSurveyPanel";

export function ExitInterviewSurveyPageClient() {
  const { requiresSelfOnboarding, isOffboarded } = useDashboardAccess();

  if (isOffboarded) {
    return (
      <DashboardPageShell>
        <div className="mx-auto max-w-3xl">
          <ExitInterviewSurveyPanel />
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
        <div className="mx-auto max-w-3xl">
          <ExitInterviewSurveyPanel />
        </div>
      </OnboardingGate>
    </DashboardPageShell>
  );
}
