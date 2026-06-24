"use client";

import type { ReactNode } from "react";
import { DashboardNavProvider } from "@/components/dashboard/DashboardNavContext";
import { DashboardChrome } from "@/components/dashboard/DashboardChrome";

function DashboardChromeBoundary({ children }: { children: ReactNode }) {
  return (
    <DashboardNavProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardNavProvider>
  );
}

export default function DashboardRouteLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardChromeBoundary>{children}</DashboardChromeBoundary>
  );
}
