"use client";

import type { ReactNode } from "react";
import { OffboardedBanner } from "@/components/dashboard/shared/OffboardedBanner";
import { OnboardingPendingBanner } from "@/components/dashboard/shared/OnboardingPendingBanner";
import { PortalLockedBanner } from "@/components/dashboard/shared/PortalLockedBanner";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";

export function OnboardingGate({
  requiresSelfOnboarding: requiresSelfOnboardingProp,
  isOffboarded: isOffboardedProp,
  isPortalLocked: isPortalLockedProp,
  allowContentWhenOnboarding = false,
  children,
}: {
  /** When omitted, read from `useDashboardAccess()`. */
  requiresSelfOnboarding?: boolean;
  isOffboarded?: boolean;
  isPortalLocked?: boolean;
  /** Profile-only: show self-onboarding form beneath the pending banner. */
  allowContentWhenOnboarding?: boolean;
  children: ReactNode;
}) {
  const access = useDashboardAccess();
  const isOffboarded = isOffboardedProp ?? access.isOffboarded;
  const isPortalLocked = isPortalLockedProp ?? access.isPortalLocked;
  const requiresSelfOnboarding = isOffboarded
    ? false
    : (requiresSelfOnboardingProp ?? access.requiresSelfOnboarding);

  if (isOffboarded) {
    return <OffboardedBanner />;
  }

  const hideChildren = requiresSelfOnboarding && !allowContentWhenOnboarding;

  return (
    <>
      {isPortalLocked ? <PortalLockedBanner /> : null}
      {requiresSelfOnboarding ? <OnboardingPendingBanner /> : null}
      {hideChildren ? null : (
        <fieldset
          disabled={isPortalLocked}
          className="min-w-0 border-0 p-0 m-0 disabled:opacity-90"
        >
          {children}
        </fieldset>
      )}
    </>
  );
}
