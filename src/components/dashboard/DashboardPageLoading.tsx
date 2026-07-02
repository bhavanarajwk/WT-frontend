"use client";

import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";

export function DashboardPageLoading({ label = "Loading page…" }: { label?: string }) {
  return (
    <main className="wt-detail-page flex min-h-[min(65vh,520px)] flex-1 items-center justify-center bg-wt-page-bg p-4 sm:p-6">
      <SectionLoading label={label} />
    </main>
  );
}
