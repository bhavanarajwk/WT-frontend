"use client";

import Link from "next/link";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { ExitInterviewResponsesView } from "@/components/exit-interview/ExitInterviewResponsesView";
import { useExitInterviewFormDefinition } from "@/hooks/exit-interview/useExitInterviewFormDefinition";
import { useExitInterviewSubmissionDetail } from "@/hooks/exit-interview/useExitInterviewSubmissionDetail";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function ExitInterviewSubmissionDetailPageClient({ empId }: { empId: string }) {
  const { hasHrAccess, userRoles } = useDashboardAccess();
  const canView = hasHrAccess || userRoles.includes("ROLE_ADMIN");

  const detailQ = useExitInterviewSubmissionDetail(empId, { enabled: canView });
  const formDefQ = useExitInterviewFormDefinition({ enabled: canView });
  const fields = formDefQ.data?.fields ?? [];

  if (!canView) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted">
          Exit interview detail is available to HR and admin only.
        </div>
      </DashboardPageShell>
    );
  }

  const detail = detailQ.data;

  return (
    <DashboardPageShell>
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href={DASHBOARD_ROUTES["exit-interview-submissions"]}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          ← Back to submissions
        </Link>

        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 px-5 py-6 md:px-7">
          {detailQ.isLoading || formDefQ.isLoading ? (
            <p className="text-sm text-wt-text-muted">Loading submission…</p>
          ) : null}

          {detailQ.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Could not load this submission.
              {detailQ.error instanceof Error ? ` ${detailQ.error.message}` : ""}
            </div>
          ) : null}

          {detail ? (
            <>
              <h3 className="text-lg font-semibold">{detail.employee_name}</h3>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-wt-text-muted">Department</dt>
                  <dd className="font-medium">{detail.department ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-wt-text-muted">Submitted</dt>
                  <dd className="font-medium tabular-nums">{formatDateTime(detail.submitted_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-wt-text-muted">Exit type</dt>
                  <dd className="font-medium">
                    {detail.exit_type ?? detail.separation_type ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-wt-text-muted">Employee ID</dt>
                  <dd className="font-medium">{detail.emp_id}</dd>
                </div>
              </dl>

              {fields.length ? (
                <div className="mt-8 border-t border-wt-border pt-6">
                  <h4 className="mb-4 text-base font-semibold">Responses</h4>
                  <ExitInterviewResponsesView fields={fields} responses={detail.responses} />
                </div>
              ) : (
                <p className="mt-6 text-sm text-wt-text-muted">Form definition unavailable for labels.</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}
