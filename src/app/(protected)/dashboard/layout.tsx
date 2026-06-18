"use client";

import { Suspense, type ReactNode } from "react";
import { DashboardNavProvider } from "@/components/dashboard/DashboardNavContext";
import { DashboardChrome } from "@/components/dashboard/DashboardChrome";
import { WtLoaderCentered } from "@/components/dashboard/ui/WtLoader";

function DashboardChromeBoundary({ children }: { children: ReactNode }) {
  return (
    <DashboardNavProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardNavProvider>
  );
}

export default function DashboardRouteLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-wt-bg">
          <WtLoaderCentered label="Loading" />
        </div>
      }
    >
      <DashboardChromeBoundary>{children}</DashboardChromeBoundary>
    </Suspense>
  );
}
