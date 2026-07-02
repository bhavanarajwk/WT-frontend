"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";

function lazyPage<P extends object>(
  loader: () => Promise<Record<string, ComponentType<P>>>,
  exportName: string,
  label: string
) {
  return dynamic(
    () => loader().then((mod) => ({ default: mod[exportName] as ComponentType<P> })),
    { loading: () => <DashboardPageLoading label={label} /> }
  );
}

export const LazyOverviewPageClient = lazyPage(
  () => import("@/components/dashboard/overview/OverviewPageClient"),
  "OverviewPageClient",
  "Loading overview…"
);

export const LazyReportsPageClient = lazyPage(
  () => import("@/components/dashboard/reports/ReportsPageClient"),
  "ReportsPageClient",
  "Loading reports…"
);

export const LazyAllocationPageClient = lazyPage(
  () => import("@/components/dashboard/allocation/AllocationPageClient"),
  "AllocationPageClient",
  "Loading allocation…"
);

export const LazyMastersPageClient = lazyPage(
  () => import("@/components/dashboard/masters/MastersPageClient"),
  "MastersPageClient",
  "Loading masters…"
);

export const LazyUploadsPageClient = lazyPage(
  () => import("@/components/dashboard/uploads/UploadsPageClient"),
  "UploadsPageClient",
  "Loading uploads…"
);

export const LazyBackgroundVerificationPageClient = lazyPage(
  () => import("@/components/dashboard/background-verification/BackgroundVerificationPageClient"),
  "BackgroundVerificationPageClient",
  "Loading background verification…"
);

export const LazyLeavePageClient = lazyPage(
  () => import("@/components/dashboard/leave/LeavePageClient"),
  "LeavePageClient",
  "Loading leave…"
);
