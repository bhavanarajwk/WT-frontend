"use client";

import { useMemo } from "react";
import type { TraineeTableRow } from "@/utils/learning/participants";
import {
  findParticipantScoreForTrainee,
  resolveOverallScorePercent,
  type ParticipantTrainingScore,
} from "@/utils/learning/trainingScores";

type ScoreDraft = { scorePct: string; markCompleted: boolean };

function parseScorePct(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

function scoreForAssessment(
  assessmentId: string,
  participant: ParticipantTrainingScore | undefined,
  draft: ScoreDraft | undefined,
  isSelected: boolean
): number | null {
  if (isSelected && draft) {
    const fromDraft = parseScorePct(draft.scorePct);
    if (fromDraft != null) return fromDraft;
  }
  const saved = participant?.scoresJson[assessmentId];
  if (saved != null && Number.isFinite(saved)) return saved;
  return null;
}

export function TraineeScoreAnalytics({
  employeeUserId,
  traineeRows,
  assessments,
  assessmentId,
  scoresByUser,
  savedScores,
  scoresLoading,
}: {
  employeeUserId: string;
  traineeRows: TraineeTableRow[];
  assessments: Array<Record<string, unknown>>;
  assessmentId: string;
  scoresByUser: Record<string, ScoreDraft>;
  savedScores: ParticipantTrainingScore[];
  scoresLoading: boolean;
}) {
  const trainee = useMemo(
    () => traineeRows.find((r) => r.userId === employeeUserId),
    [traineeRows, employeeUserId]
  );

  const participantScore = useMemo(
    () =>
      employeeUserId
        ? findParticipantScoreForTrainee(savedScores, employeeUserId, trainee?.email)
        : undefined,
    [savedScores, employeeUserId, trainee?.email]
  );

  const draft = scoresByUser[employeeUserId] ?? { scorePct: "0", markCompleted: false };
  const selectedAssessment = useMemo(
    () => assessments.find((a) => String(a.id ?? "").trim() === assessmentId.trim()),
    [assessments, assessmentId]
  );
  const selectedName = String(selectedAssessment?.name ?? "Selected assessment").trim();
  const selectedId = assessmentId.trim();
  const currentScore = scoreForAssessment(
    selectedId,
    participantScore,
    draft,
    Boolean(selectedId)
  );
  const overallScore = resolveOverallScorePercent(participantScore, assessments);
  const totalAssessments = assessments.length;
  const scoredAssessmentCount = useMemo(() => {
    if (!participantScore) return 0;
    return assessments.filter((a) => {
      const id = String(a.id ?? "").trim();
      return id && participantScore.scoresJson[id] != null;
    }).length;
  }, [assessments, participantScore]);
  const markedComplete = participantScore?.isCompleted ?? draft.markCompleted;

  if (!employeeUserId) {
    return (
      <p className="text-sm text-wt-text-muted">
        Select an employee to see score and completion analytics for this training.
      </p>
    );
  }

  if (!trainee) {
    return (
      <p className="text-sm text-wt-text-muted">
        Selected employee is not enrolled in this training.
      </p>
    );
  }

  if (!assessmentId.trim()) {
    return (
      <p className="text-sm text-wt-text-muted">
        Select an assessment to view score analytics for {trainee.name}.
      </p>
    );
  }

  if (!totalAssessments) {
    return (
      <p className="text-sm text-wt-text-muted">
        No assessments defined for this training yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{trainee.name}</p>
      {scoresLoading ? (
        <p className="text-xs text-wt-text-muted">Loading saved scores…</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Overall score
          </p>
          <p className="text-2xl font-semibold mt-1 text-indigo-700">
            {overallScore != null ? `${overallScore}%` : "—"}
          </p>
          <p className="text-xs text-wt-text-muted mt-1">
            Weighted across all assessments
            {scoredAssessmentCount > 0
              ? ` (${scoredAssessmentCount}/${totalAssessments} scored)`
              : ""}
          </p>
        </article>
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Total assessments
          </p>
          <p className="text-2xl font-semibold mt-1">{totalAssessments}</p>
        </article>
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Current score
          </p>
          <p className="text-2xl font-semibold mt-1 text-sky-700">
            {currentScore != null ? `${currentScore}%` : "—"}
          </p>
          <p className="text-xs text-wt-text-muted mt-1 truncate" title={selectedName}>
            {selectedName}
          </p>
        </article>
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Training completion
          </p>
          <p
            className={`text-2xl font-semibold mt-1 ${
              markedComplete ? "text-emerald-700" : "text-wt-text-muted"
            }`}
          >
            {markedComplete ? "Complete" : "In progress"}
          </p>
        </article>
        <article className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
            Enrollment
          </p>
          <p className="text-2xl font-semibold mt-1 text-base">{trainee.enrollmentStatus}</p>
        </article>
      </div>
      <div className="wt-scroll-both overflow-x-auto rounded-lg border border-wt-border">
        <table className="min-w-full text-sm">
          <thead className="bg-wt-surface-2 text-wt-text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Assessment</th>
              <th className="text-left px-3 py-2 font-medium">Weight</th>
              <th className="text-left px-3 py-2 font-medium">Score (%)</th>
              <th className="text-left px-3 py-2 font-medium">Completion</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => {
              const id = String(a.id ?? "").trim();
              const name = String(a.name ?? `Assessment ${id}`).trim();
              const weight = Number(a.weight_percent ?? a.weightPercent ?? 0);
              const isSelected = id === assessmentId.trim();
              const rowScore = scoreForAssessment(
                id,
                participantScore,
                isSelected ? draft : undefined,
                isSelected
              );
              return (
                <tr
                  key={id || name}
                  className={`border-t border-wt-border ${isSelected ? "bg-wt-surface-2/60" : ""}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {name}
                    {isSelected ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-wt-text-muted">
                        (selected)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-wt-text-muted">
                    {Number.isFinite(weight) && weight > 0 ? `${weight}%` : "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {rowScore != null ? (
                      <span className={`font-medium ${isSelected ? "text-sky-700" : ""}`}>
                        {rowScore}%
                      </span>
                    ) : (
                      <span className="text-wt-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {isSelected ? (
                      <span
                        className={
                          markedComplete ? "text-emerald-700 font-medium" : "text-wt-text-muted"
                        }
                      >
                        {markedComplete ? "Marked complete" : "Not completed"}
                      </span>
                    ) : (
                      <span className="text-wt-text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
