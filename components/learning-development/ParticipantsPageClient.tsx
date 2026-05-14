"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useTrainingParticipants } from "@/components/learning-development/hooks/useLearningTrainings";
import { useLearningTrainerDirectory } from "@/components/learning-development/hooks/useLearningTrainerDirectory";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { DataTable } from "@/components/learning-development/ui/forms";
import { resolveLearningTrainerUserId } from "@/src/lib/learning/resolveTrainerUserId";
import { hrmsService } from "@/src/services/hrms.service";

export function ParticipantsPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const [trainingId, setTrainingId] = useState("");
  const [participantPick, setParticipantPick] = useState("");
  const qc = useQueryClient();
  const participantsQ = useTrainingParticipants(trainingId, Boolean(trainingId.trim()));
  const directoryQ = useLearningTrainerDirectory();

  const addMut = useMutation({
    mutationFn: async () => {
      const idNum = await resolveLearningTrainerUserId(participantPick);
      await hrmsService.addTrainingParticipants(trainingId, { user_ids: [idNum], select_all: false });
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["learning", "participants", trainingId] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Participants</h1>
          <p className="text-sm text-wt-text-muted mt-1">Manage roster enrollment.</p>
        </div>
        {trainingId ? (
          <Link href={`/dashboard/learning-development/trainings/${encodeURIComponent(trainingId)}?tab=participants`} className="text-sm font-medium text-indigo-600 hover:underline self-center">
            Detail view
          </Link>
        ) : null}
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} />

      {hasHrAccess ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <label className="text-xs text-wt-text-muted flex flex-col gap-1">
              Add employee
              <select className="input-field px-3 py-2 text-sm" value={participantPick} onChange={(e) => setParticipantPick(e.target.value)}>
                <option value="">Select</option>
                {(directoryQ.data ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-primary px-3 py-2 text-sm sm:mb-0" disabled={addMut.isPending || !participantPick || !trainingId} onClick={() => addMut.mutate(undefined, { onError: (e) => alert(String(e)) })}>
              Add participant
            </button>
          </div>
        </section>
      ) : (
        <p className="text-sm text-wt-text-muted">Participant management requires HR/Admin.</p>
      )}

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <DataTable
          columns={["id", "training_id", "user_id", "name", "email", "enrollment_status"]}
          rows={participantsQ.data ?? []}
          emptyLabel="No participants."
        />
      </section>
    </div>
  );
}
