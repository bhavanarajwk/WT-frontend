"use client";

import Link from "next/link";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useExitInterviewProfile } from "@/hooks/exit-interview/useExitInterviewProfile";

export function ExitInterviewProfileBanner() {
  const { isOffboarded } = useDashboardAccess();
  const { data, isLoading } = useExitInterviewProfile();
  const flags = data?.flags;

  if (isOffboarded || isLoading || !flags?.exit_interview_applicable) return null;

  if (flags.exit_interview_submitted) {
    return (
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Your exit survey has been submitted. Thank you.
      </div>
    );
  }

  if (flags.can_fill_exit_interview) {
    const days = flags.exit_interview_days_until_last_working_day;
    return (
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
        <p className="font-medium">Exit survey due</p>
        <p className="mt-1 text-indigo-900/90">
          Please complete your exit survey before your last working day
          {days != null ? ` (${days} day${days === 1 ? "" : "s"} remaining)` : ""}.
        </p>
        <Link
          href={DASHBOARD_ROUTES["exit-interview"]}
          className="mt-2 inline-block text-sm font-medium text-indigo-700 hover:underline"
        >
          Open exit survey →
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-wt-border bg-wt-surface-2/80 px-4 py-3 text-sm text-wt-text-muted">
      Your exit survey will open during your notice period.
    </div>
  );
}
