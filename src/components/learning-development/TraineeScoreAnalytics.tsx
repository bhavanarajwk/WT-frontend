"use client";

import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
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
      <ScrollableTable maxHeightClass="max-h-[min(70vh,520px)]">
        <WtTable>
          <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 bg-wt-surface-2 z-10">
                Employee
              </TableHead>
              {assessmentColumns.map((a) => (
                <TableHead
                  key={a.id}
                  className="min-w-[7rem]"
                  title={a.name}
                >
                  {a.name}
                </TableHead>
              ))}
              <TableHead className="min-w-[8rem]">
                Overall avg score
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                <TableRow key={trainee.key}>
                  <TableCell className="sticky left-0 bg-wt-surface-1 z-10">
                    {trainee.name}
                  </TableCell>
                  {assessmentColumns.map((a) => {
                    const score = scoreForAssessment(
                      a.id,
                      participant,
                      draft,
                      a.id === selectedAssessmentId
                    );
                    return (
                      <TableCell key={a.id} className="whitespace-nowrap">
                        {score != null ? `${score}%` : "—"}
                      </TableCell>
                    );
                  })}
                  <TableCell className="whitespace-nowrap">
                    {overall != null ? `${overall}%` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </WtTable>
      </ScrollableTable>
    </div>
  );
}
