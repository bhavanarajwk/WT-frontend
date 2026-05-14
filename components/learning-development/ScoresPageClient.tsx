"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTrainingAssessments } from "@/components/learning-development/hooks/useLearningTrainings";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { DataTable, InputField } from "@/components/learning-development/ui/forms";
import { participantRowUserId } from "@/src/lib/learning/participants";
import { resolveLearningTrainerUserId } from "@/src/lib/learning/resolveTrainerUserId";
import { toPagedRows } from "@/src/lib/apiRows";
import { hrmsService } from "@/src/services/hrms.service";

export function ScoresPageClient() {
  const [trainingId, setTrainingId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [scorePct, setScorePct] = useState("0");
  const [markCompleted, setMarkCompleted] = useState(true);

  const assessmentsQ = useTrainingAssessments(trainingId, Boolean(trainingId.trim()));

  const participantsQ = useQuery({
    queryKey: ["learning", "participants", trainingId],
    enabled: Boolean(trainingId.trim()),
    queryFn: async () => {
      const res = await hrmsService.getTrainingParticipants(trainingId);
      return toPagedRows(res.data ?? res);
    },
  });

  const [localScores, setLocalScores] = useState<Array<Record<string, unknown>>>([]);

  const qc = useQueryClient();

  const participantOptions = useMemo(() => {
    const rows = participantsQ.data ?? [];
    const options: Array<{ id: string; label: string }> = [];
    for (const row of rows) {
      const id = participantRowUserId(row);
      if (!id) continue;
      const name = String(row.name ?? row.employee_name ?? id).trim();
      options.push({ id, label: `${name} (${id})` });
    }
    return options;
  }, [participantsQ.data]);

  const submitMut = useMutation({
    mutationFn: async () => {
      const userId = await resolveLearningTrainerUserId(participantId);
      const assessId =
        assessmentsQ.data && assessmentsQ.data.length > 0
          ? String(assessmentsQ.data[0]?.id ?? "1").trim() || "1"
          : "1";
      const pct = Number(scorePct ?? "0");
      const res = await hrmsService.submitTrainingScores(trainingId, {
        user_id: userId,
        scores_json: { [assessId]: Number.isFinite(pct) ? pct : 0 },
        mark_completed: markCompleted,
      });
      const scoreRow = ((res as { data?: unknown }).data ?? res) as Record<string, unknown>;
      setLocalScores((prev) => [scoreRow, ...prev].slice(0, 25));
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scores &amp; completion</h1>
        <p className="text-sm text-wt-text-muted mt-1">Submit scores mapped to the first assessment id when multiple exist.</p>
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} />

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
            Participant
            <select className="input-field px-3 py-2 text-sm" value={participantId} onChange={(e) => setParticipantId(e.target.value)}>
              <option value="">Select</option>
              {participantOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <InputField label="Score (%)" value={scorePct} onChange={setScorePct} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={markCompleted} onChange={(e) => setMarkCompleted(e.target.checked)} />
          Mark completed
        </label>
        <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={submitMut.isPending || !trainingId || !participantId} onClick={() => submitMut.mutate(undefined, { onError: (e) => alert(String(e)) })}>
          Submit scores
        </button>
      </section>

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <DataTable title="Latest submissions (this browser session)" columns={["id", "training_id", "user_id", "scores_json", "final_score_percent", "is_completed"]} rows={localScores} emptyLabel="No scores submitted yet this session." />
      </section>
    </div>
  );
}
