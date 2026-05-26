"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTrainingTrainers } from "@/hooks/learning/useLearningTrainings";
import { useLearningTrainerDirectory } from "@/hooks/learning/useLearningTrainerDirectory";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { DataTable } from "@/components/learning-development/ui/forms";
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
  const [removeTrainerPick, setRemoveTrainerPick] = useState("");
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
    setRemoveTrainerPick("");
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

  const removeTrainer = () =>
    void runAction("Remove trainer", async () => {
      const idNum = await resolveLearningTrainerUserId(removeTrainerPick);
      await hrmsService.removeTrainer(trainingId, String(idNum));
      setRemoveTrainerPick("");
      await qc.invalidateQueries({ queryKey: ["learning", "trainers", trainingId] });
      await qc.invalidateQueries({ queryKey: ["learning", "training", trainingId] });
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

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} />

      {hasHrAccess ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <label className="text-xs text-wt-text-muted flex flex-col gap-1">
              Assign trainer
              <select
                className="input-field px-3 py-2 text-sm"
                value={trainerPick}
                onChange={(e) => setTrainerPick(e.target.value)}
              >
                <option value="">Select trainer</option>
                {trainerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2 pb-1">
              <button
                type="button"
                className="btn-primary px-3 py-2 text-sm"
                disabled={!trainerPick || !trainingId}
                onClick={assignTrainer}
              >
                Assign
              </button>
            </div>
            <label className="text-xs text-wt-text-muted flex flex-col gap-1">
              Remove trainer
              <select
                className="input-field px-3 py-2 text-sm"
                value={removeTrainerPick}
                onChange={(e) => setRemoveTrainerPick(e.target.value)}
              >
                <option value="">Select assigned trainer</option>
                {(trainersQ.data ?? []).map((row) => {
                  const uid = String(
                    row.trainer_user_id ?? row.trainerUserId ?? row.user_id ?? row.userId ?? ""
                  );
                  return (
                    <option key={uid} value={uid}>
                      {`${row.name ?? "Trainer"} (${row.email ?? uid})`}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="flex flex-wrap gap-2 pb-1">
              <button
                type="button"
                className="btn-ghost px-3 py-2 text-sm border border-wt-border rounded-lg"
                disabled={!removeTrainerPick || !trainingId}
                onClick={removeTrainer}
              >
                Remove
              </button>
            </div>
          </div>
          {onboardQ.isLoading ? (
            <p className="text-xs text-wt-text-muted">Loading employees from onboard list…</p>
          ) : null}
          {trainingId && !onboardQ.isLoading && trainerOptions.length === 0 ? (
            <p className="text-xs text-wt-text-muted">
              No available employees to assign, or all onboard employees are already trainers for this training.
            </p>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-wt-text-muted">Trainer assignment requires HR/Admin.</p>
      )}

      <section className="rounded-2xl border border-wt-surface-1 p-5">
        <DataTable
          title="Assigned trainers"
          columns={["name", "email"]}
          rows={trainersQ.data ?? []}
          emptyLabel={trainersQ.isLoading ? "Loading trainers…" : "No trainers assigned."}
        />
      </section>
    </div>
    <DashboardToast toast={toast} />
    </>
  );
}