"use client";

import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMyTrainingMarks } from "@/hooks/learning/useLearningTrainings";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";

function myMarksErrorMessage(error: unknown): {
  message: string;
  showEnroll: boolean;
} {
  if (!(error instanceof ApiError)) {
    return {
      message: error instanceof Error ? error.message : "Could not load scores.",
      showEnroll: false,
    };
  }

  const detail = error.message.trim();
  const lower = detail.toLowerCase();

  if (error.status === 403 && lower.includes("not enrolled")) {
    return {
      message:
        detail ||
        "You are not enrolled in this training. Enroll below or ask HR to add you as a trainee.",
      showEnroll: true,
    };
  }

  if (error.status === 403 && (lower.includes("not published") || lower.includes("publish"))) {
    return {
      message:
        detail.includes("Publish") || detail.includes("publish")
          ? detail
          : "Scores are saved but not published yet. HR must click Publish for each assessment on the Scores tab before you can view them here.",
      showEnroll: false,
    };
  }

  if (error.status === 404) {
    return {
      message: detail || "No scores found for your account on this training yet.",
      showEnroll: false,
    };
  }

  return { message: detail || "Could not load scores.", showEnroll: false };
}

export function EmployeeTrainingMyMarks({
  trainingId,
  enabled = true,
}: {
  trainingId: string;
  enabled?: boolean;
}) {
  const qc = useQueryClient();
  const marksQ = useMyTrainingMarks(trainingId, Boolean(enabled && trainingId.trim()));

  const enrollMut = useMutation({
    mutationFn: () => hrmsService.selfEnrollTraining(trainingId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "my-marks", trainingId] });
      await qc.invalidateQueries({ queryKey: ["learning", "trainings", "open"] });
    },
  });

  if (marksQ.isLoading) {
    return <SectionLoading label="Loading your scores…" />;
  }

  if (marksQ.isError) {
    const { message, showEnroll } = myMarksErrorMessage(marksQ.error);
    return (
      <div className="space-y-3">
        <p className="text-sm text-wt-text-muted">{message}</p>
        {showEnroll ? (
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm"
            disabled={enrollMut.isPending}
            onClick={() =>
              enrollMut.mutate(undefined, {
                onError: (e) => alert(e instanceof Error ? e.message : String(e)),
              })
            }
          >
            {enrollMut.isPending ? "Enrolling…" : "Enroll in this training"}
          </button>
        ) : null}
      </div>
    );
  }

  const marks = marksQ.data;
  if (!marks?.assessments.length) {
    return (
      <p className="text-sm text-wt-text-muted">
        No published scores yet for this training.
      </p>
    );
  }

  const scoredCount = marks.assessments.length;
  const totalWeight = marks.assessments.reduce(
    (sum, a) => sum + (a.weightPercent > 0 ? a.weightPercent : 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Overall score
          </p>
          <p className="text-2xl font-semibold mt-1 text-indigo-700">
            {marks.finalScorePercent != null ? `${marks.finalScorePercent}%` : "—"}
          </p>
          <p className="text-xs text-wt-text-muted mt-1">
            {marks.allAssessmentsPublished
              ? "Final score (all assessments published)"
              : "Shown when every assessment is published"}
          </p>
        </article>
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Assessments scored
          </p>
          <p className="text-2xl font-semibold mt-1">{scoredCount}</p>
        </article>
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Publication status
          </p>
          <p
            className={`text-lg font-semibold mt-1 ${
              marks.allAssessmentsPublished ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {marks.allAssessmentsPublished ? "All published" : "Partially published"}
          </p>
          {totalWeight > 0 ? (
            <p className="text-xs text-wt-text-muted mt-1">Total weight: {totalWeight}%</p>
          ) : null}
        </article>
      </div>

      <div className="wt-scroll-both max-h-[min(70vh,520px)] overflow-auto rounded-lg border border-wt-border">
        <table className="wt-scrollable-table text-sm">
          <thead className="wt-table-sticky-head text-wt-text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Assessment</th>
              <th className="text-left px-3 py-2 font-medium">Weight</th>
              <th className="text-left px-3 py-2 font-medium">Score (%)</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {marks.assessments.map((a) => (
              <tr key={a.assessmentId} className="border-t border-wt-border">
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2 text-wt-text-muted">
                  {a.weightPercent > 0 ? `${a.weightPercent}%` : "—"}
                </td>
                <td className="px-3 py-2 font-medium text-sky-700">{a.score}%</td>
                <td className="px-3 py-2 text-emerald-700">Published</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
