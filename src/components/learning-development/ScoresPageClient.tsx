"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { TraineeScoreAnalytics } from "@/components/learning-development/TraineeScoreAnalytics";
import {
  useTrainingAssessments,
  useTrainingParticipants,
  useTrainingScores,
} from "@/hooks/learning/useLearningTrainings";
import { FieldLabel } from "@/components/dashboard/ui/forms";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { traineeTableRowsFromParticipants } from "@/utils/learning/participants";
import { resolveLearningTrainerUserId } from "@/utils/learning/resolveTrainerUserId";
import {
  findParticipantScoreForTrainee,
  resolveOverallScorePercent,
} from "@/utils/learning/trainingScores";
import { hrmsService } from "@/services/hrms.service";

type ScoreDraft = { scorePct: string; markCompleted: boolean };

export function ScoresPageClient({ fixedTrainingId }: { fixedTrainingId?: string }) {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const [pickedTrainingId, setPickedTrainingId] = useState("");
  const trainingId = fixedTrainingId?.trim() || pickedTrainingId;
  const embedded = Boolean(fixedTrainingId?.trim());
  const [assessmentId, setAssessmentId] = useState("");
  const [viewEmployeeId, setViewEmployeeId] = useState("");
  const [scoresByUser, setScoresByUser] = useState<Record<string, ScoreDraft>>({});

  const assessmentsQ = useTrainingAssessments(trainingId, Boolean(trainingId.trim()));
  const traineesQ = useTrainingParticipants(trainingId, Boolean(trainingId.trim()));
  const savedScoresQ = useTrainingScores(
    trainingId,
    Boolean(trainingId.trim()) && hasHrAccess
  );
  const qc = useQueryClient();
  const { toast, actionLoading, runAction } = useDashboardAction();

  const traineeRows = useMemo(
    () => traineeTableRowsFromParticipants(traineesQ.data ?? []),
    [traineesQ.data]
  );

  const assessments = assessmentsQ.data ?? [];
  const scoresSnapshot = savedScoresQ.data ?? null;
  const savedScores = useMemo(
    () => scoresSnapshot?.participants ?? [],
    [scoresSnapshot]
  );

  const selectedAssessment = useMemo(
    () => assessments.find((a) => String(a.id ?? "").trim() === assessmentId.trim()),
    [assessments, assessmentId]
  );

  const marksPublishedAt = String(
    selectedAssessment?.marks_published_at ??
      selectedAssessment?.marksPublishedAt ??
      ""
  ).trim();

  const marksAlreadyPublished = Boolean(marksPublishedAt);

  useEffect(() => {
    if (!assessments.length) {
      setAssessmentId("");
      return;
    }
    const stillValid = assessments.some((a) => String(a.id ?? "") === assessmentId);
    if (!stillValid) {
      setAssessmentId(String(assessments[0]?.id ?? "").trim());
    }
  }, [assessments, assessmentId]);

  useEffect(() => {
    setScoresByUser((prev) => {
      const next: Record<string, ScoreDraft> = {};
      for (const row of traineeRows) {
        next[row.userId] = prev[row.userId] ?? { scorePct: "0", markCompleted: true };
      }
      return next;
    });
  }, [traineeRows]);

  useEffect(() => {
    setViewEmployeeId("");
  }, [trainingId]);

  useEffect(() => {
    const assessId = assessmentId.trim();
    if (!assessId || !savedScores.length) return;
    setScoresByUser((prev) => {
      const next = { ...prev };
      for (const row of traineeRows) {
        const participant = findParticipantScoreForTrainee(
          savedScores,
          row.userId,
          row.email
        );
        const score = participant?.scoresJson[assessId];
        if (score == null || !Number.isFinite(score)) continue;
        next[row.userId] = {
          scorePct: String(score),
          markCompleted: participant?.isCompleted ?? prev[row.userId]?.markCompleted ?? false,
        };
      }
      return next;
    });
  }, [savedScores, assessmentId, traineeRows]);

  const saveScores = () =>
    void runAction("Save scores", async () => {
      if (!trainingId) throw new Error("Select a training.");
      if (!traineeRows.length) throw new Error("No trainees enrolled for this training.");
      const assessId = assessmentId.trim() || String(assessments[0]?.id ?? "1").trim() || "1";
      if (!assessId) throw new Error("Select an assessment.");
      for (const row of traineeRows) {
        const draft = scoresByUser[row.userId] ?? { scorePct: "0", markCompleted: true };
        const pct = Number(draft.scorePct);
        const userId = await resolveLearningTrainerUserId(row.userId);
        await hrmsService.submitTrainingScores(trainingId, {
          user_id: userId,
          scores_json: { [assessId]: Number.isFinite(pct) ? pct : 0 },
          mark_completed: draft.markCompleted,
        });
      }
      await qc.invalidateQueries({ queryKey: ["learning"] });
      await qc.invalidateQueries({ queryKey: ["learning", "scores", trainingId] });
    });

  const publishScores = () =>
    void runAction("Publish scores", async () => {
      const assessId = assessmentId.trim();
      if (!trainingId) throw new Error("Select a training.");
      if (!assessId) throw new Error("Select an assessment.");
      if (!traineeRows.length) throw new Error("No trainees enrolled for this training.");
      await hrmsService.publishTrainingMarks(trainingId, assessId);
      await qc.invalidateQueries({ queryKey: ["learning", "assessments", trainingId] });
      await qc.invalidateQueries({ queryKey: ["learning", "scores", trainingId] });
      await qc.invalidateQueries({ queryKey: ["learning", "my-marks", trainingId] });
    });

  return (
    <>
    <div className="space-y-6">
      {!embedded ? (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Scores &amp; completion</h1>
            <p className="text-sm text-wt-text-muted mt-1">
              Select a training and assessment, enter scores for each trainee, then save.
            </p>
          </div>
          <TrainingScopePicker
            trainingId={pickedTrainingId}
            onTrainingIdChange={(id) => {
              setPickedTrainingId(id);
              setAssessmentId("");
              setViewEmployeeId("");
            }}
            required
          />
        </>
      ) : null}

      <label className="text-xs text-wt-text-muted flex flex-col gap-1 max-w-md">
        <FieldLabel label="Assessment" required />
        <select
          className="input-field px-3 py-2 text-sm"
          required
          aria-required
          value={assessmentId}
          onChange={(e) => setAssessmentId(e.target.value)}
          disabled={!trainingId || assessmentsQ.isLoading}
        >
          <option value="">
            {assessmentsQ.isLoading ? "Loading…" : assessments.length ? "Select assessment" : "No assessments"}
          </option>
          {assessments.map((a) => {
            const id = String(a.id ?? "").trim();
            const name = String(a.name ?? `Assessment ${id}`).trim();
            return (
              <option key={id} value={id}>
                {name}
              </option>
            );
          })}
        </select>
      </label>

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-wt-border pb-4">
          <div>
            <h2 className="font-semibold">Trainee scores</h2>
            {marksAlreadyPublished ? (
              <p className="text-xs text-wt-text-muted mt-1">
                Marks for this assessment were published
                {marksPublishedAt ? ` on ${new Date(marksPublishedAt).toLocaleString()}` : ""}.
              </p>
            ) : hasHrAccess ? (
              <p className="text-xs text-wt-text-muted mt-1">
                Save scores for all trainees, then publish to email marks to each employee.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              disabled={
                actionLoading ||
                !trainingId ||
                !traineeRows.length ||
                !assessmentId
              }
              onClick={saveScores}
            >
              {actionLoading ? "Saving…" : "Save scores"}
            </button>
            {hasHrAccess ? (
              <button
                type="button"
                className="btn-ghost px-4 py-2 text-sm border border-wt-border rounded-lg"
                disabled={
                  actionLoading ||
                  !trainingId ||
                  !traineeRows.length ||
                  !assessmentId ||
                  marksAlreadyPublished
                }
                title={
                  marksAlreadyPublished
                    ? "Marks for this assessment are already published."
                    : "Email published scores to all trainees for the selected assessment."
                }
                onClick={publishScores}
              >
                {actionLoading ? "Publishing…" : "Publish"}
              </button>
            ) : null}
          </div>
        </div>

        {!trainingId ? (
          <p className="text-sm text-wt-text-muted">Select a training to load trainees.</p>
        ) : traineesQ.isLoading ? (
          <p className="text-sm text-wt-text-muted">Loading trainees…</p>
        ) : traineeRows.length === 0 ? (
          <p className="text-sm text-wt-text-muted">No trainees enrolled for this training.</p>
        ) : !assessmentId ? (
          <p className="text-sm text-wt-text-muted">Select an assessment before saving scores.</p>
        ) : (
          <div className="wt-scroll-both overflow-x-auto rounded-xl border border-wt-border">
            <table className="min-w-full text-sm">
              <thead className="bg-wt-surface-2 text-wt-text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Trainee</th>
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Score (%)</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Overall (%)</th>
                  <th className="text-left px-3 py-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {traineeRows.map((row) => {
                  const draft = scoresByUser[row.userId] ?? { scorePct: "0", markCompleted: true };
                  const participant = findParticipantScoreForTrainee(
                    savedScores,
                    row.userId,
                    row.email
                  );
                  const overall = resolveOverallScorePercent(participant, assessments);
                  return (
                    <tr key={row.key} className="border-t border-wt-border">
                      <td className="px-3 py-2 whitespace-nowrap">{row.name}</td>
                      <td className="px-3 py-2 text-wt-text-muted">{row.email || "—"}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="input-field px-2 py-1.5 text-sm w-full max-w-[6rem]"
                          value={draft.scorePct}
                          onChange={(e) =>
                            setScoresByUser((prev) => ({
                              ...prev,
                              [row.userId]: { ...draft, scorePct: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-wt-text-muted whitespace-nowrap">
                        {overall != null ? `${overall}%` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.markCompleted}
                            onChange={(e) =>
                              setScoresByUser((prev) => ({
                                ...prev,
                                [row.userId]: { ...draft, markCompleted: e.target.checked },
                              }))
                            }
                          />
                          <span className="text-xs text-wt-text-muted">Mark completed</span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <h2 className="font-semibold">Score analytics</h2>
        <p className="text-xs text-wt-text-muted">
          Scores and completion for the selected assessment and trainee.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
            <FieldLabel label="Assessment" required />
            <select
              className="input-field px-3 py-2 text-sm"
              required
              aria-required
              value={assessmentId}
              onChange={(e) => setAssessmentId(e.target.value)}
              disabled={!trainingId || assessmentsQ.isLoading}
            >
              <option value="">
                {assessmentsQ.isLoading
                  ? "Loading…"
                  : assessments.length
                    ? "Select assessment"
                    : "No assessments"}
              </option>
              {assessments.map((a) => {
                const id = String(a.id ?? "").trim();
                const name = String(a.name ?? `Assessment ${id}`).trim();
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
            View employee
            <select
              className="input-field px-3 py-2 text-sm"
              value={viewEmployeeId}
              onChange={(e) => setViewEmployeeId(e.target.value)}
              disabled={!trainingId || !traineeRows.length}
            >
              <option value="">Select employee</option>
              {traineeRows.map((row) => (
                <option key={row.userId} value={row.userId}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TraineeScoreAnalytics
          employeeUserId={viewEmployeeId}
          traineeRows={traineeRows}
          assessments={assessments}
          assessmentId={assessmentId}
          scoresByUser={scoresByUser}
          savedScores={savedScores}
          scoresLoading={savedScoresQ.isLoading}
        />
      </section>
    </div>
    <DashboardToast toast={toast} />
    </>
  );
}
