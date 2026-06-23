"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTrainingParticipants } from "@/hooks/learning/useLearningTrainings";
import { useLearningTrainerDirectory } from "@/hooks/learning/useLearningTrainerDirectory";
import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { SelectField } from "@/components/dashboard/ui/forms";
import { TrainingParticipantsList } from "@/components/learning-development/TrainingParticipantsList";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { participantRowUserId } from "@/utils/learning/participants";
import { resolveLearningTrainerUserId } from "@/utils/learning/resolveTrainerUserId";
import { hrmsService } from "@/services/hrms.service";

export function ParticipantsPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const [trainingId, setTrainingId] = useState("");
  const [traineePick, setTraineePick] = useState("");
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null);
  const qc = useQueryClient();
  const traineesQ = useTrainingParticipants(trainingId, Boolean(trainingId.trim()));
  const onboardQ = useLearningTrainerDirectory();

  const enrolledUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of traineesQ.data ?? []) {
      const id = participantRowUserId(row);
      if (id) ids.add(id);
    }
    return ids;
  }, [traineesQ.data]);

  const addTraineeOptions = useMemo(
    () => (onboardQ.data ?? []).filter((o) => !enrolledUserIds.has(o.id)),
    [onboardQ.data, enrolledUserIds]
  );

  useEffect(() => {
    setTraineePick("");
  }, [trainingId]);

  const addMut = useMutation({
    mutationFn: async () => {
      const idNum = await resolveLearningTrainerUserId(traineePick);
      await hrmsService.addTrainingParticipants(trainingId, { user_ids: [idNum], select_all: false });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "participants", trainingId] });
      setTraineePick("");
    },
  });

  const updateParticipantStatus = async (userId: string, status: "COMPLETED" | "WITHDRAWN") => {
    setUpdatingParticipantId(userId);
    try {
      await hrmsService.updateTrainingParticipantStatus(trainingId, userId, status);
      await qc.invalidateQueries({ queryKey: ["learning", "participants", trainingId] });
    } finally {
      setUpdatingParticipantId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trainees</h1>
          <p className="text-sm text-wt-text-muted mt-1">Manage training roster enrollment.</p>
        </div>
        {trainingId ? (
          <Link
            href={`/dashboard/learning-development/trainings/${encodeURIComponent(trainingId)}?tab=participants`}
            className="text-sm font-medium text-indigo-600 hover:underline self-center"
          >
            Detail view
          </Link>
        ) : null}
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} required />

      {hasHrAccess ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <SelectField
              label="Add trainee"
              required
              className="min-w-[min(100%,280px)] flex-1 max-w-md"
              value={traineePick}
              onChange={setTraineePick}
              placeholder="Select trainee"
              options={addTraineeOptions.map((o) => ({ value: o.id, label: o.label }))}
            />
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm shrink-0"
              disabled={addMut.isPending || !traineePick || !trainingId}
              onClick={() => addMut.mutate(undefined, { onError: (e) => alert(String(e)) })}
            >
              {addMut.isPending ? "Adding…" : "Add trainee"}
            </button>
          </div>
          {onboardQ.isLoading ? (
            <SectionLoading compact label="Loading employees from onboard list…" className="py-2" />
          ) : null}
          <TrainingParticipantsList
            rows={traineesQ.data ?? []}
            loading={traineesQ.isLoading}
            canManage={hasHrAccess}
            updatingUserId={updatingParticipantId}
            onMarkCompleted={
              trainingId
                ? (userId) =>
                    void updateParticipantStatus(userId, "COMPLETED").catch((e) =>
                      alert(e instanceof Error ? e.message : "Failed")
                    )
                : undefined
            }
            onMarkWithdrawn={
              trainingId
                ? (userId) =>
                    void updateParticipantStatus(userId, "WITHDRAWN").catch((e) =>
                      alert(e instanceof Error ? e.message : "Failed")
                    )
                : undefined
            }
          />
        </section>
      ) : (
        <p className="text-sm text-wt-text-muted">Trainee management requires HR/Admin.</p>
      )}
    </div>
  );
}
