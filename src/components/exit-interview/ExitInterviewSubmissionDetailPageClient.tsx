"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { ExitInterviewResponsesView } from "@/components/exit-interview/ExitInterviewResponsesView";
import { useExitInterviewFormDefinition } from "@/hooks/exit-interview/useExitInterviewFormDefinition";
import { useUpdateExitInterviewMinutesOfMeeting } from "@/hooks/exit-interview/useExitInterviewMinutesOfMeeting";
import { useExitInterviewSubmissionDetail } from "@/hooks/exit-interview/useExitInterviewSubmissionDetail";
import { formatApiDateDisplay } from "@/utils/apiDate";
import {
  exitInterviewFieldsWithResponses,
  formFieldForResponseItem,
  formatResponseForDisplay,
} from "@/utils/exitInterview";
import { formatEmployeeStatusLabel } from "@/utils/userStatus";

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

export function ExitInterviewSubmissionDetailPageClient({ lookupId }: { lookupId: string }) {
  const { hasHrAccess, userRoles } = useDashboardAccess();
  const canView = hasHrAccess || userRoles.includes("ROLE_ADMIN");
  const { actionLoading, runAction } = useDashboardAction();

  const detailQ = useExitInterviewSubmissionDetail(lookupId, { enabled: canView });
  const formDefQ = useExitInterviewFormDefinition({ enabled: canView && Boolean(detailQ.data) });
  const updateMomMutation = useUpdateExitInterviewMinutesOfMeeting(lookupId);
  const [minutesOfMeeting, setMinutesOfMeeting] = useState("");
  const fields = formDefQ.data?.fields ?? [];

  useEffect(() => {
    setMinutesOfMeeting(detailQ.data?.minutes_of_meeting ?? "");
  }, [detailQ.data?.minutes_of_meeting]);

  const responseFields = useMemo(() => {
    const detail = detailQ.data;
    if (!detail) return [];
    if (detail.response_fields?.length) {
      return detail.response_fields.map((item) => ({
        item,
        field: formFieldForResponseItem(item, fields),
      }));
    }
    const visible = exitInterviewFieldsWithResponses(fields, detail.responses ?? {});
    return visible.map((field) => ({
      item: { field: field.key, label: field.label, value: detail.responses[field.key] },
      field,
    }));
  }, [detailQ.data, fields]);

  if (!canView) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted">
          Exit survey detail is available to HR and admin only.
        </div>
      </DashboardPageShell>
    );
  }

  const detail = detailQ.data;

  const saveMinutesOfMeeting = () => {
    void runAction("Save minutes of meeting", async () => {
      await updateMomMutation.mutateAsync(minutesOfMeeting);
    });
  };

  const momSaving = actionLoading || updateMomMutation.isPending;

  return (
    <DashboardPageShell>
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href={DASHBOARD_ROUTES["exit-interview-submissions"]}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          ← Back to Exit Survey
        </Link>

        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 px-5 py-6 md:px-7">
          {detailQ.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Could not load this submission.
              {detailQ.error instanceof Error ? ` ${detailQ.error.message}` : ""}
            </div>
          ) : null}

          {detail ? (
            <>
              <h3 className="text-lg font-semibold">{detail.employee_name}</h3>
              <p className="mt-1 text-sm text-wt-text-muted">{detail.email}</p>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-wt-text-muted">Department</dt>
                  <dd className="font-medium">{detail.department ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-wt-text-muted">Employee ID</dt>
                  <dd className="font-medium">{detail.emp_id ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-wt-text-muted">Submitted</dt>
                  <dd className="font-medium tabular-nums">{formatDateTime(detail.submitted_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-wt-text-muted">Employee status</dt>
                  <dd className="font-medium">
                    {formatEmployeeStatusLabel(detail.employee_status)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-wt-text-muted">Resignation date</dt>
                  <dd className="font-medium tabular-nums">
                    {formatApiDateDisplay(detail.resignation_date) || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-wt-text-muted">Last working day</dt>
                  <dd className="font-medium tabular-nums">
                    {formatApiDateDisplay(detail.last_working_day) || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-wt-text-muted">Separation type</dt>
                  <dd className="font-medium">
                    {detail.exit_type ?? detail.separation_type ?? "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 border-t border-wt-border pt-6">
                <h4 className="mb-4 text-base font-semibold">Responses</h4>
                {responseFields.length ? (
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {responseFields.map(({ item, field }) => (
                      <div
                        key={item.field}
                        className={`rounded-lg border border-wt-border bg-wt-surface-2/50 px-4 py-3 ${
                          field.widget === "textarea" ? "sm:col-span-2" : ""
                        }`}
                      >
                        <dt className="text-xs font-medium uppercase tracking-wide text-wt-text-muted">
                          {item.label}
                        </dt>
                        <dd className="mt-1 text-sm text-wt-text whitespace-pre-wrap">
                          {formatResponseForDisplay(field, item.value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : fields.length && detail.responses ? (
                  <ExitInterviewResponsesView fields={fields} responses={detail.responses} />
                ) : (
                  <p className="text-sm text-wt-text-muted">No survey responses recorded.</p>
                )}
              </div>

              <div className="mt-8 border-t border-wt-border pt-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-semibold">Minutes of Meeting (MOM)</h4>
                    <p className="mt-1 text-xs text-wt-text-muted">
                      HR notes from the exit survey discussion. Clear the field and save to remove.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary px-3 py-1.5 text-sm"
                    disabled={momSaving}
                    onClick={saveMinutesOfMeeting}
                  >
                    {momSaving ? "Saving…" : "Save MOM"}
                  </button>
                </div>
                <textarea
                  className="input-field min-h-[140px] w-full px-3 py-2 text-sm"
                  value={minutesOfMeeting}
                  onChange={(e) => setMinutesOfMeeting(e.target.value)}
                  disabled={momSaving}
                  placeholder="Add HR notes from the exit survey meeting…"
                  aria-label="Minutes of meeting"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}
