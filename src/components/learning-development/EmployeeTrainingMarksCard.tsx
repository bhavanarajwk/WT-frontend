"use client";

import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { LEARNING_BASE } from "@/constants/learningNav";
import {
  useHrTrainingsList,
  useOpenTrainingsList,
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

type HrTrainingMarks = {
  trainingId: string;
  trainingName: string;
  enrollmentStatus: string;
  participant: ParticipantTrainingScore | null;
  assessments: Array<{ id: string; name: string; weightPercent: number; published: boolean }>;
  overall: number | null;
};

function MarksTable({
  rows,
}: {
  rows: Array<{ name: string; weight: string; score: string; status: string }>;
}) {
  if (!rows.length) return <p className="text-sm text-wt-text-muted">No assessment scores yet.</p>;
  return (
    <div className="wt-scroll-both max-h-[min(70vh,520px)] overflow-auto rounded-lg border border-wt-border">
      <table className="wt-scrollable-table text-sm">
        <thead className="wt-table-sticky-head text-wt-text-muted">
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

function EmployeeMarksBlock({ marks }: { marks: MyTrainingMarks }) {
  const rows = marks.assessments.map((a) => ({
    name: a.name,
    weight: a.weightPercent > 0 ? `${a.weightPercent}%` : "—",
    score: `${a.score}%`,
    status: "Published",
  }));
  return (
    <article className="rounded-xl border border-wt-border bg-wt-surface-2/40 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-sm">{marks.trainingName}</h4>
          <p className="text-xs text-wt-text-muted mt-0.5">Training #{marks.trainingId}</p>
        </div>
        <p className="text-lg font-semibold text-indigo-700">
          {marks.finalScorePercent != null ? `${marks.finalScorePercent}%` : "—"}
          <span className="text-xs font-normal text-wt-text-muted ml-1">overall</span>
        </p>
      </div>
      <MarksTable rows={rows} />
    </article>
  );
}

function HrMarksBlock({ entry }: { entry: HrTrainingMarks }) {
  const rows = entry.assessments.map((a) => {
    const score = entry.participant?.scoresJson[a.id];
    return {
      name: a.name,
      weight: a.weightPercent > 0 ? `${a.weightPercent}%` : "—",
      score: score != null ? `${score}%` : "—",
      status: a.published ? "Published" : "Draft",
    };
  });
  return (
    <article className="rounded-xl border border-wt-border bg-wt-surface-2/40 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-sm">{entry.trainingName}</h4>
          <p className="text-xs text-wt-text-muted mt-0.5">
            Training #{entry.trainingId} · {entry.enrollmentStatus}
          </p>
        </div>
        <p className="text-lg font-semibold text-indigo-700">
          {entry.overall != null ? `${entry.overall}%` : "—"}
          <span className="text-xs font-normal text-wt-text-muted ml-1">overall</span>
        </p>
      </div>
      <MarksTable rows={rows} />
    </article>
  );
}

function EmployeeTrainingMarksCardEmployee({ enabled = true }: { enabled?: boolean }) {
  const openTrainingsQ = useOpenTrainingsList(enabled);

  const openTrainingIds = useMemo(
    () =>
      (openTrainingsQ.data ?? [])
        .map((row) => String(row.id ?? "").trim())
        .filter(Boolean),
    [openTrainingsQ.data]
  );

  const myMarksQueries = useQueries({
    queries: openTrainingIds.map((trainingId) => ({
      queryKey: ["learning", "my-marks", trainingId],
      enabled: Boolean(enabled),
      retry: false,
      staleTime: 30_000,
      queryFn: async () => {
        try {
          const res = await hrmsService.getMyTrainingMarks(trainingId);
          return normalizeMyTrainingMarks((res as { data?: unknown }).data ?? res);
        } catch (error) {
          if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
            return null;
          }
          throw error;
        }
      },
    })),
  });

  const employeeMarks = useMemo(
    () =>
      myMarksQueries
        .map((q) => q.data)
        .filter((m): m is MyTrainingMarks => Boolean(m && m.assessments.length)),
    [myMarksQueries]
  );

  const loading = openTrainingsQ.isLoading || myMarksQueries.some((q) => q.isLoading);

  return (
    <section className="rounded-xl border border-wt-border p-5 md:p-6 space-y-4">
      <div>
        <h4 className="text-base font-semibold">Training scores</h4>
        <p className="text-xs text-wt-text-muted mt-1">
          Published marks for open trainings you enrolled in.
        </p>
      </div>

      {loading ? <p className="text-sm text-wt-text-muted">Loading training scores…</p> : null}

      {!loading && employeeMarks.length ? (
        <div className="space-y-4">
          {employeeMarks.map((marks) => (
            <EmployeeMarksBlock key={marks.trainingId} marks={marks} />
          ))}
        </div>
      ) : null}

      {!loading && !employeeMarks.length ? (
        <p className="text-sm text-wt-text-muted">
          No published marks yet. Enroll in an open training and check back after HR publishes scores.
        </p>
      ) : null}
    </section>
  );
}

function EmployeeTrainingMarksCardHr({
  targetUserId,
  targetEmail,
  enabled = true,
}: {
  targetUserId?: string;
  targetEmail?: string;
  enabled?: boolean;
}) {
  const allTrainingsQ = useHrTrainingsList(enabled);

  const hrTrainingIds = useMemo(
    () =>
      (allTrainingsQ.data ?? [])
        .map((row) => String(row.id ?? "").trim())
        .filter(Boolean),
    [allTrainingsQ.data]
  );

  const trainingNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of allTrainingsQ.data ?? []) {
      const id = String(row.id ?? "").trim();
      if (!id) continue;
      map.set(id, String(row.name ?? `Training ${id}`).trim());
    }
    return map;
  }, [allTrainingsQ.data]);

  const hrScoresQueries = useQueries({
    queries: hrTrainingIds.map((trainingId) => ({
      queryKey: ["learning", "scores", trainingId],
      enabled: Boolean(enabled),
      staleTime: 30_000,
      queryFn: async () => {
        const res = await hrmsService.getTrainingScores(trainingId);
        return normalizeTrainingScoresHrSnapshot((res as { data?: unknown }).data ?? res);
      },
    })),
  });

  const hrMarks = useMemo((): HrTrainingMarks[] => {
    if (!targetUserId?.trim()) return [];
    const out: HrTrainingMarks[] = [];
    for (const query of hrScoresQueries) {
      const snapshot = query.data;
      if (!snapshot) continue;
      const participant = findParticipantScoreForTrainee(
        snapshot.participants,
        targetUserId,
        targetEmail
      );
      if (!participant) continue;
      const assessments = snapshot.assessments.length
        ? snapshot.assessments.map((a) => ({
            id: a.id,
            name: a.name,
            weightPercent: a.weightPercent,
            published: Boolean(a.marksPublishedAt),
          }))
        : [];
      const overall = resolveOverallScorePercent(
        participant,
        assessments.map((a) => ({ id: a.id, weight_percent: a.weightPercent }))
      );
      out.push({
        trainingId: snapshot.trainingId,
        trainingName: trainingNameById.get(snapshot.trainingId) ?? `Training ${snapshot.trainingId}`,
        enrollmentStatus: participant.isCompleted ? "COMPLETED" : "ENROLLED",
        participant,
        assessments,
        overall,
      });
    }
    return out.sort((a, b) => a.trainingName.localeCompare(b.trainingName));
  }, [targetUserId, targetEmail, hrScoresQueries, trainingNameById]);

  const loading = allTrainingsQ.isLoading || hrScoresQueries.some((q) => q.isLoading);

  return (
    <section className="rounded-xl border border-wt-border p-5 md:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold">Training scores</h4>
          <p className="text-xs text-wt-text-muted mt-1">
            Scores for trainings this employee is enrolled in (from HR scores API).
          </p>
        </div>
        <Link
          href={`${LEARNING_BASE}/trainings`}
          className="text-sm font-medium text-indigo-600 hover:underline shrink-0"
        >
          Manage trainings
        </Link>
      </div>

      {loading ? <p className="text-sm text-wt-text-muted">Loading training scores…</p> : null}

      {!loading && hrMarks.length ? (
        <div className="space-y-4">
          {hrMarks.map((entry) => (
            <HrMarksBlock key={entry.trainingId} entry={entry} />
          ))}
        </div>
      ) : null}

      {!loading && !hrMarks.length ? (
        <p className="text-sm text-wt-text-muted">
          No training scores for this employee. Assign them as a trainee and save scores in Learning
          &amp; Development.
        </p>
      ) : null}
    </section>
  );
}

/** Employee profile: published marks via GET …/my-marks. HR: scores via GET …/scores. */
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
  if (variant === "hr") {
    return (
      <EmployeeTrainingMarksCardHr
        targetUserId={targetUserId}
        targetEmail={targetEmail}
        enabled={enabled}
      />
    );
  }
  return <EmployeeTrainingMarksCardEmployee enabled={enabled} />;
}
