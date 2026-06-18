"use client";

import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { ExitSurveyFollowUpPanel } from "@/components/exit-interview/ExitSurveyFollowUpPanel";

export function ExitInterviewSubmissionsPageClient() {
  const { hasHrAccess, userRoles } = useDashboardAccess();
  const canView = hasHrAccess || userRoles.includes("ROLE_ADMIN");

  if (!canView) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted">
          Exit survey is available to HR and admin only.
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="border-b border-wt-border px-5 py-5 md:px-7 md:py-6">
          <h3 className="text-lg font-semibold">Exit Survey</h3>
        </div>
        <div className="p-5 md:p-7">
          <ExitSurveyFollowUpPanel />
        </div>
      </div>
    </DashboardPageShell>
  );
}
