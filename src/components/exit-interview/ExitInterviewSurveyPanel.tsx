"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { ExitInterviewFormFields } from "@/components/exit-interview/ExitInterviewFormFields";
import { useExitInterviewFormDefinition } from "@/hooks/exit-interview/useExitInterviewFormDefinition";
import { useExitInterviewProfile } from "@/hooks/exit-interview/useExitInterviewProfile";
import { exitInterviewService } from "@/services/exitInterview.service";
import {
  buildExitInterviewSubmitBody,
  initialFormAnswers,
  validateExitInterviewAnswers,
} from "@/utils/exitInterview";

function formatDateLabel(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

/** Exit interview survey (employee self-serve, including offboarded users in notice). */
export function ExitInterviewSurveyPanel({ className = "" }: { className?: string }) {
  const queryClient = useQueryClient();
  const { toast, actionLoading, runAction } = useDashboardAction();

  const profileQ = useExitInterviewProfile();
  const flags = profileQ.data?.flags;
  const autofill = profileQ.data?.autofill ?? {};

  const showForm = Boolean(
    flags?.exit_interview_applicable &&
      flags.can_fill_exit_interview &&
      !flags.exit_interview_submitted
  );

  const formDefQ = useExitInterviewFormDefinition({
    enabled: Boolean(flags?.exit_interview_applicable && !flags?.exit_interview_submitted),
  });
  const fields = formDefQ.data?.fields ?? [];

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!formDefQ.data || initialized || !showForm) return;
    setAnswers(initialFormAnswers(formDefQ.data));
    setInitialized(true);
  }, [formDefQ.data, initialized, showForm]);

  const daysLeft = flags?.exit_interview_days_until_last_working_day;

  const statusMessage = useMemo(() => {
    if (profileQ.isLoading) return null;
    if (!flags?.exit_interview_applicable) return null;
    if (flags.exit_interview_submitted) {
      return "Thank you — your exit interview has been submitted.";
    }
    if (!flags.can_fill_exit_interview) {
      return "Your exit interview will be available during your notice period.";
    }
    return null;
  }, [profileQ.isLoading, flags]);

  const onChange = (key: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = () => {
    if (!formDefQ.data) return;
    const errors = validateExitInterviewAnswers(formDefQ.data, answers);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    void runAction("Submit exit interview", async () => {
      const body = buildExitInterviewSubmitBody(formDefQ.data, answers);
      await exitInterviewService.submit(body);
      await queryClient.invalidateQueries({ queryKey: ["profile", "exit-interview"] });
      setInitialized(false);
    });
  };

  if (!profileQ.isLoading && flags && !flags.exit_interview_applicable) {
    return null;
  }

  return (
    <div className={className}>
      <DashboardToast toast={toast} />

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 px-5 py-6 md:px-7">
        <h3 className="text-lg font-semibold">Exit survey</h3>

        {profileQ.isError ? (
          <p className="mt-3 text-sm text-rose-600">
            Could not load your profile.
            {profileQ.error instanceof Error ? ` ${profileQ.error.message}` : ""}
          </p>
        ) : null}

        {profileQ.isLoading ? (
          <p className="mt-3 text-sm text-wt-text-muted">Loading exit interview…</p>
        ) : null}

        {statusMessage ? (
          <p className="mt-3 text-sm text-wt-text-muted">{statusMessage}</p>
        ) : null}

        {showForm && flags ? (
          <>
            <div className="mt-4 grid gap-3 rounded-xl border border-wt-border bg-wt-surface-2/60 p-4 text-sm sm:grid-cols-2">
              <div>
                <span className="text-wt-text-muted">Resignation date</span>
                <p className="font-medium tabular-nums">
                  {formatDateLabel(flags.exit_interview_resignation_date)}
                </p>
              </div>
              <div>
                <span className="text-wt-text-muted">Last working day</span>
                <p className="font-medium tabular-nums">
                  {formatDateLabel(flags.exit_interview_last_working_day)}
                </p>
              </div>
              {daysLeft != null ? (
                <div className="sm:col-span-2">
                  <span className="text-wt-text-muted">Days until last working day</span>
                  <p className="font-medium tabular-nums">{daysLeft}</p>
                </div>
              ) : null}
            </div>

            {formDefQ.isLoading ? (
              <p className="mt-6 text-sm text-wt-text-muted">Loading form…</p>
            ) : null}

            {formDefQ.isError ? (
              <p className="mt-6 text-sm text-rose-600">Could not load the survey questions.</p>
            ) : null}

            {formDefQ.data && fields.length ? (
              <div className="mt-6">
                <ExitInterviewFormFields
                  fields={fields}
                  autofill={autofill}
                  answers={answers}
                  errors={fieldErrors}
                  onChange={onChange}
                  disabled={actionLoading}
                />
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="btn-primary px-4 py-2 text-sm"
                    disabled={actionLoading}
                    onClick={handleSubmit}
                  >
                    {actionLoading ? "Submitting…" : "Submit exit interview"}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {flags?.exit_interview_submitted ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Your responses have been recorded. No further action is needed.
          </div>
        ) : null}
      </div>
    </div>
  );
}
