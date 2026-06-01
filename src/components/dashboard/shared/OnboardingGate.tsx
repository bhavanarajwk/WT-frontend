"use client";

import type { ReactNode } from "react";
import { OffboardedBanner } from "@/components/dashboard/shared/OffboardedBanner";
import { OnboardingPendingBanner } from "@/components/dashboard/shared/OnboardingPendingBanner";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";

export function OnboardingGate({
  requiresSelfOnboarding: requiresSelfOnboardingProp,
  isOffboarded: isOffboardedProp,
  allowContentWhenOnboarding = false,
  children,
}: {
  /** When omitted, read from `useDashboardAccess()`. */
  requiresSelfOnboarding?: boolean;
  isOffboarded?: boolean;
  /** Profile-only: show self-onboarding form beneath the pending banner. */
  allowContentWhenOnboarding?: boolean;
  children: ReactNode;
}) {
  const access = useDashboardAccess();
  const isOffboarded = isOffboardedProp ?? access.isOffboarded;
  const requiresSelfOnboarding = isOffboarded
    ? false
    : (requiresSelfOnboardingProp ?? access.requiresSelfOnboarding);

  if (isOffboarded) {
    return <OffboardedBanner />;
  }

  const hideChildren = requiresSelfOnboarding && !allowContentWhenOnboarding;

  return (
    <>
      {requiresSelfOnboarding ? <OnboardingPendingBanner /> : null}
      {hideChildren ? null : children}
    </>
  );
}
