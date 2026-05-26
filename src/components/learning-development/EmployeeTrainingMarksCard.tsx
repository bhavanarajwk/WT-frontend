"use client";

import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { LEARNING_BASE } from "@/constants/learningNav";
import {
  useMyTrainingEnrollments,
} from "@/hooks/learning/useLearningTrainings";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import {
  findParticipantScoreForTrainee,
  normalizeMyTrainingMarks,
  normalizeTrainingScoresHrSnapshot,
  resolveOverallScorePercent,
  type MyTrainingMarks,
  type ParticipantTrainingScore,
} from "@/utils/learning/trainingScores";

type EnrollmentRow = Record<string, unknown>;

type HrTrainingMarks = {
  trainingId: string;
  trainingName: string;
  enrollmentStatus: string;
  participant: ParticipantTrainingScore | null;
  assessments: Array<{ id: string; name: string; weightPercent: number; published: boolean }>;
  overall: number | null;
  marks: MyTrainingMarks | null;
  marksPending: boolean;
};

function MarksTable({
  rows,
}: {
  rows: Array<{ name: string; weight: string; score: string; status: string }>;
}) {
  if (!rows.length) return <p className="text-sm text-wt-text-muted">No assessment scores yet.</p>;
  return (
    <div className="wt-scroll-both overflow-x-auto rounded-lg border border-wt-border">
      <table className="min-w-full text-sm">
        <thead className="bg-wt-surface-2 text-wt-text-muted">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Assessment</th>
            <th className="text-left px-3 py-2 font-medium">Weight</th>
            <th className="text-left px-3 py-2 font-medium">Score</th>
            <th className="text-left px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-wt-border">
              <td className="px-3 py-2">{row.name}</td>
              <td className="px-3 py-2 text-wt-text-muted">{row.weight}</td>
              <td className="px-3 py-2 font-medium">{row.score}</td>
              <td className="px-3 py-2 text-wt-text-muted">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrainingMarksArticle({
  title,
  trainingId,
  enrollmentStatus,
  overall,
  marksPending,
  children,
}: {
  title: string;
  trainingId: string;
  enrollmentStatus: string;
  overall: number | null;
  marksPending?: boolean;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-wt-border bg-wt-surface-2/40 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs text-wt-text-muted mt-0.5">
            Training #{trainingId} · {enrollmentStatus}
          </p>
        </div>
        <p className="text-lg font-semibold text-indigo-700">
          {overall != null ? `${overall}%` : "—"}
          <span className="text-xs font-normal text-wt-text-muted ml-1">overall</span>
        </p>
      </div>
      {marksPending ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Enrolled — marks not published yet. They will appear here after HR publishes scores.
        </p>
      ) : null}
      {children}
    </article>
  );
}

/** Employee: GET …/my-marks per enrolled training. HR: GET …/scores for that employee. */
export function EmployeeTrainingMarksCard({
  variant,
  targetUserId,
  targetEmail,
  enabled = true,
}: {
  variant: "employee" | "hr";
  targetUserId?: string;
  targetEmail?: string;
  enabled?: boolean;
}) {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrListAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const enrollmentUserKey =
    variant === "hr" && targetUserId?.trim() && !targetUserId.startsWith("email:")
      ? targetUserId.trim()
      : variant === "employee"
        ? undefined
        : undefined;

  const enrollmentsQ = useMyTrainingEnrollments(
    enrollmentUserKey,
    Boolean(enabled && (variant === "employee" || Boolean(enrollmentUserKey)))
  );

  const enrollments = enrollmentsQ.data ?? [];

  const enrolledTrainingIds = useMemo(
    () =>
      enrollments
        .map((row) => String(row.id ?? "").trim())
        .filter(Boolean),
    [enrollments]
  );

  const myMarksQueries = useQueries({
    queries: enrolledTrainingIds.map((trainingId) => ({
      queryKey: ["learning", "my-marks", trainingId],
      enabled: Boolean(enabled && variant === "employee"),
      retry: false,
      staleTime: 30_000,
      queryFn: async () => {
        try {
          const res = await hrmsService.getMyTrainingMarks(trainingId);
          return normalizeMyTrainingMarks((res as { data?: unknown }).data ?? res);
        } catch (error) {
          if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
            return { trainingId, pending: true as const };
          }
          throw error;
        }
      },
    })),
  });

  const hrScoresQueries = useQueries({
    queries: enrolledTrainingIds.map((trainingId) => ({
      queryKey: ["learning", "scores", trainingId],
      enabled: Boolean(enabled && variant === "hr" && hasHrListAccess),
      staleTime: 30_000,
      queryFn: async () => {
        const res = await hrmsService.getTrainingScores(trainingId);
        return normalizeTrainingScoresHrSnapshot((res as { data?: unknown }).data ?? res);
      },
    })),
  });

  const employeeEntries = useMemo(() => {
    if (variant !== "employee") return [];
    return enrollments.map((row, index) => {
      const trainingId = String(row.id ?? "").trim();
      const trainingName = String(row.name ?? `Training ${trainingId}`).trim();
      const enrollmentStatus = String(
        row.enrollment_status ?? row.enrollmentStatus ?? "ENROLLED"
      ).trim();
      const query = myMarksQueries[index];
      const data = query?.data;
      if (data && "pending" in data && data.pending) {
        return {
          trainingId,
          trainingName,
          enrollmentStatus,
          marks: null as MyTrainingMarks | null,
          marksPending: true,
          overall: null as number | null,
        };
      }
      const marks = data && !("pending" in data) ? (data as MyTrainingMarks) : null;
      return {
        trainingId,
        trainingName,
        enrollmentStatus,
        marks,
        marksPending: !marks,
        overall: marks?.finalScorePercent ?? null,
      };
    });
  }, [variant, enrollments, myMarksQueries]);

  const hrEntries = useMemo((): HrTrainingMarks[] => {
    if (variant !== "hr" || !targetUserId?.trim()) return [];
    return enrollments.map((row, index) => {
      const trainingId = String(row.id ?? "").trim();
      const trainingName = String(row.name ?? `Training ${trainingId}`).trim();
      const enrollmentStatus = String(
        row.enrollment_status ?? row.enrollmentStatus ?? "ENROLLED"
      ).trim();
      const snapshot = hrScoresQueries[index]?.data;
      const participant = snapshot
        ? findParticipantScoreForTrainee(
            snapshot.participants,
            targetUserId,
            targetEmail
          ) ?? null
        : null;
      const assessments = snapshot?.assessments.length
        ? snapshot.assessments.map((a) => ({
            id: a.id,
            name: a.name,
            weightPercent: a.weightPercent,
            published: Boolean(a.marksPublishedAt),
          }))
        : [];
      const overall = resolveOverallScorePercent(
        participant ?? undefined,
        assessments.map((a) => ({ id: a.id, weight_percent: a.weightPercent }))
      );
      return {
        trainingId,
        trainingName,
        enrollmentStatus,
        participant,
        assessments,
        overall,
        marks: null,
        marksPending: !participant?.scoresJson || !Object.keys(participant.scoresJson).length,
      };
    });
  }, [variant, enrollments, hrScoresQueries, targetUserId, targetEmail]);

  const loading =
    enrollmentsQ.isLoading ||
    (variant === "employee" && myMarksQueries.some((q) => q.isLoading)) ||
    (variant === "hr" && hrScoresQueries.some((q) => q.isLoading));

  const noEnrollments = !loading && enrollments.length === 0;

  return (
    <section className="rounded-xl border border-wt-border p-5 md:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold">Training &amp; scores</h4>
          <p className="text-xs text-wt-text-muted mt-1">
            {variant === "employee"
              ? "Trainings you are enrolled in. Published marks appear after HR publishes them."
              : "Trainings this employee is enrolled in, including draft and published scores."}
          </p>
        </div>
        {hasHrListAccess ? (
          <Link
            href={`${LEARNING_BASE}/trainings`}
            className="text-sm font-medium text-indigo-600 hover:underline shrink-0"
          >
            Manage trainings
          </Link>
        ) : null}
      </div>

      {variant === "hr" && !enrollmentUserKey && targetEmail ? (
        <p className="text-sm text-wt-text-muted">
          Cannot load training enrollments: employee user id is missing from the profile. Scores are
          keyed by user id in the API.
        </p>
      ) : null}

      {loading ? <p className="text-sm text-wt-text-muted">Loading trainings…</p> : null}

      {noEnrollments ? (
        <p className="text-sm text-wt-text-muted">
          {variant === "employee"
            ? "You are not enrolled in any trainings yet."
            : "This employee is not enrolled in any trainings yet. Assign them under Learning & Development → training → Trainees."}
        </p>
      ) : null}

      {!loading && variant === "employee"
        ? employeeEntries.map((entry) => {
            const markRows =
              entry.marks?.assessments.map((a) => ({
                name: a.name,
                weight: a.weightPercent > 0 ? `${a.weightPercent}%` : "—",
                score: `${a.score}%`,
                status: "Published",
              })) ?? [];
            return (
              <TrainingMarksArticle
                key={entry.trainingId}
                title={entry.trainingName}
                trainingId={entry.trainingId}
                enrollmentStatus={entry.enrollmentStatus}
                overall={entry.overall}
                marksPending={entry.marksPending}
              >
                {!entry.marksPending ? <MarksTable rows={markRows} /> : null}
              </TrainingMarksArticle>
            );
          })
        : null}

      {!loading && variant === "hr"
        ? hrEntries.map((entry) => {
            const markRows = entry.assessments.map((a) => {
              const score = entry.participant?.scoresJson[a.id];
              return {
                name: a.name,
                weight: a.weightPercent > 0 ? `${a.weightPercent}%` : "—",
                score: score != null ? `${score}%` : "—",
                status: a.published ? "Published" : "Draft",
              };
            });
            return (
              <TrainingMarksArticle
                key={entry.trainingId}
                title={entry.trainingName}
                trainingId={entry.trainingId}
                enrollmentStatus={entry.enrollmentStatus}
                overall={entry.overall}
                marksPending={entry.marksPending && !markRows.some((r) => r.score !== "—")}
              >
                {markRows.length ? <MarksTable rows={markRows} /> : null}
                {entry.participant?.isCompleted ? (
                  <p className="text-xs text-emerald-700">Training marked complete.</p>
                ) : null}
              </TrainingMarksArticle>
            );
          })
        : null}
    </section>
  );
}
