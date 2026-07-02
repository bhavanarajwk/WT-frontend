import { Suspense } from "react";
import { LazyAllocationPageClient } from "@/components/dashboard/lazyPages";
import { DashboardPageLoading } from "@/components/dashboard/DashboardPageLoading";

export default function DashboardAllocationPage() {
  return (
    <Suspense fallback={<DashboardPageLoading label="Loading allocation…" />}>
      <LazyAllocationPageClient />
    </Suspense>
  );
}
