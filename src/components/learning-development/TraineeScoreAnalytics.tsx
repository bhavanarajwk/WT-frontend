"use client";

import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";

import { useMemo } from "react";
import type { TraineeTableRow } from "@/utils/learning/participants";
import {
  computeWeightedOverallScore,
  findParticipantScoreForTrainee,
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
  includeDraft: boolean
): number | null {
  if (includeDraft && draft) {
    const fromDraft = parseScorePct(draft.scorePct);
    if (fromDraft != null) return fromDraft;
  }
  const saved = participant?.scoresJson[assessmentId];
  if (saved != null && Number.isFinite(saved)) return saved;
  return null;
}

function mergedScoresJson(
  participant: ParticipantTrainingScore | undefined,
  draft: ScoreDraft | undefined,
  selectedAssessmentId: string
): Record<string, number> {
  const base = { ...(participant?.scoresJson ?? {}) };
  if (selectedAssessmentId && draft) {
    const fromDraft = parseScorePct(draft.scorePct);
    if (fromDraft != null) base[selectedAssessmentId] = fromDraft;
  }
  return base;
}

export function TraineeScoreAnalytics({
  traineeRows,
  assessments,
  assessmentId,
  scoresByUser,
  savedScores,
  scoresLoading,
}: {
  traineeRows: TraineeTableRow[];
  assessments: Array<Record<string, unknown>>;
  assessmentId: string;
  scoresByUser: Record<string, ScoreDraft>;
  savedScores: ParticipantTrainingScore[];
  scoresLoading: boolean;
}) {
  const assessmentColumns = useMemo(
    () =>
      assessments
        .map((a) => {
          const id = String(a.id ?? "").trim();
          const name = String(a.name ?? `Assessment ${id}`).trim();
          return id ? { id, name: name || id } : null;
        })
        .filter((a): a is { id: string; name: string } => Boolean(a)),
    [assessments]
  );

  const selectedAssessmentId = assessmentId.trim();

  if (!traineeRows.length) {
    return (
      <p className="text-sm text-wt-text-muted">No trainees enrolled for this training.</p>
    );
  }

  if (!assessmentColumns.length) {
    return (
      <p className="text-sm text-wt-text-muted">
        No assessments defined for this training yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {scoresLoading ? (
        <SectionLoading compact label="Loading saved scores…" className="py-2" />
      ) : null}
      <div className="wt-scroll-both max-h-[min(70vh,520px)] overflow-auto rounded-xl border border-wt-border">
        <table className="wt-scrollable-table text-sm">
          <thead className="wt-table-sticky-head text-wt-text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap sticky left-0 bg-wt-surface-2 z-10">
                Employee
              </th>
              {assessmentColumns.map((a) => (
                <th
                  key={a.id}
                  className="text-left px-3 py-2 font-medium whitespace-nowrap min-w-[7rem]"
                  title={a.name}
                >
                  {a.name}
                </th>
              ))}
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap min-w-[8rem]">
                Overall avg score
              </th>
            </tr>
          </thead>
          <tbody>
            {traineeRows.map((trainee) => {
              const participant = findParticipantScoreForTrainee(
                savedScores,
                trainee.userId,
                trainee.email
              );
              const draft = scoresByUser[trainee.userId];
              const overall = computeWeightedOverallScore(
                mergedScoresJson(participant, draft, selectedAssessmentId),
                assessments
              );

              return (
                <tr key={trainee.key} className="border-t border-wt-border">
                  <td className="px-3 py-2 whitespace-nowrap font-medium sticky left-0 bg-wt-surface-1 z-10">
                    {trainee.name}
                  </td>
                  {assessmentColumns.map((a) => {
                    const score = scoreForAssessment(
                      a.id,
                      participant,
                      draft,
                      a.id === selectedAssessmentId
                    );
                    return (
                      <td key={a.id} className="px-3 py-2 whitespace-nowrap">
                        {score != null ? (
                          <span className="font-medium">{score}%</span>
                        ) : (
                          <span className="text-wt-text-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 whitespace-nowrap font-semibold text-indigo-700">
                    {overall != null ? `${overall}%` : "—"}
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
