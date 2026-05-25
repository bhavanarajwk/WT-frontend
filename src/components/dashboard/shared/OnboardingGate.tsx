"use client";

import type { ReactNode } from "react";
import { OnboardingPendingBanner } from "@/components/dashboard/shared/OnboardingPendingBanner";

export function OnboardingGate({
  requiresSelfOnboarding,
  children,
}: {
  requiresSelfOnboarding: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {requiresSelfOnboarding ? <OnboardingPendingBanner /> : null}
      {requiresSelfOnboarding ? null : children}
    </>
  );
}
