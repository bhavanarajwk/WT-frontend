"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTrainingTrainers } from "@/hooks/learning/useLearningTrainings";
import { useLearningTrainerDirectory } from "@/hooks/learning/useLearningTrainerDirectory";
import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { SelectField } from "@/components/dashboard/ui/forms";
import { AssignedTrainersList } from "@/components/learning-development/AssignedTrainersList";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { resolveLearningTrainerUserId } from "@/utils/learning/resolveTrainerUserId";
import { hrmsService } from "@/services/hrms.service";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";

export function TrainersPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const [trainingId, setTrainingId] = useState("");
  const [trainerPick, setTrainerPick] = useState("");
  const [removingTrainerId, setRemovingTrainerId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { toast, runAction } = useDashboardAction();
  const trainersQ = useTrainingTrainers(trainingId, Boolean(trainingId.trim()));
  const onboardQ = useLearningTrainerDirectory();

  const assignedTrainerUserIds = useMemo(() => {
    const rows = trainersQ.data ?? [];
    const ids = new Set<string>();
    for (const r of rows) {
      const u = String(
        r.trainer_user_id ?? r.trainerUserId ?? r.user_id ?? r.userId ?? ""
      ).trim();
      if (u && Number(u) > 0) ids.add(u);
    }
    return ids;
  }, [trainersQ.data]);

  const trainerOptions = useMemo(
    () => (onboardQ.data ?? []).filter((o) => !assignedTrainerUserIds.has(o.id)),
    [onboardQ.data, assignedTrainerUserIds]
  );

  useEffect(() => {
    setTrainerPick("");
  }, [trainingId]);

  useEffect(() => {
    if (trainerPick && !trainerOptions.some((o) => o.id === trainerPick)) {
      setTrainerPick("");
    }
  }, [trainerPick, trainerOptions]);

  const assignTrainer = () =>
    void runAction("Assign trainer", async () => {
      const idNum = await resolveLearningTrainerUserId(trainerPick);
      await hrmsService.assignTrainers(trainingId, [idNum]);
      setTrainerPick("");
      await qc.invalidateQueries({ queryKey: ["learning", "trainers", trainingId] });
      await qc.invalidateQueries({ queryKey: ["learning", "training", trainingId] });
    });

  const removeTrainerById = (trainerUserId: string) =>
    void runAction("Remove trainer", async () => {
      setRemovingTrainerId(trainerUserId);
      try {
        const idNum = await resolveLearningTrainerUserId(trainerUserId);
        await hrmsService.removeTrainer(trainingId, String(idNum));
        await qc.invalidateQueries({ queryKey: ["learning", "trainers", trainingId] });
        await qc.invalidateQueries({ queryKey: ["learning", "training", trainingId] });
      } finally {
        setRemovingTrainerId(null);
      }
    });

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Trainers</h1>
            <p className="text-sm text-wt-text-muted mt-1">Assign or remove trainers per training.</p>
          </div>
          {trainingId ? (
            <Link
              href={`/dashboard/learning-development/trainings/${encodeURIComponent(trainingId)}?tab=trainers`}
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
                label="Assign trainer"
                required
                className="min-w-[min(100%,280px)] flex-1 max-w-md"
                value={trainerPick}
                onChange={setTrainerPick}
                placeholder="Select trainer"
                options={trainerOptions.map((o) => ({ value: o.id, label: o.label }))}
              />
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm shrink-0"
                disabled={!trainerPick || !trainingId}
                onClick={assignTrainer}
              >
                Assign
              </button>
            </div>
            {onboardQ.isLoading ? (
              <SectionLoading compact label="Loading employees from onboard list…" className="py-2" />
            ) : null}
            {trainingId && !onboardQ.isLoading && trainerOptions.length === 0 ? (
              <p className="text-xs text-wt-text-muted">
                No available employees to assign, or all onboard employees are already trainers for this
                training.
              </p>
            ) : null}
            <AssignedTrainersList
              rows={trainersQ.data ?? []}
              loading={trainersQ.isLoading}
              canManage={hasHrAccess}
              removingUserId={removingTrainerId}
              onRemove={trainingId ? removeTrainerById : undefined}
            />
          </section>
        ) : (
          <p className="text-sm text-wt-text-muted">Trainer assignment requires HR/Admin.</p>
        )}
      </div>
      <DashboardToast toast={toast} />
    </>
  );
}
