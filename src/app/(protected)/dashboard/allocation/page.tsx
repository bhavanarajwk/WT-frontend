import { Suspense } from "react";
import { AllocationPageClient } from "@/components/dashboard/allocation/AllocationPageClient";

export default function DashboardAllocationPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted">
          Loading allocation…
        </div>
      }
    >
      <AllocationPageClient />
    </Suspense>
  );
}
