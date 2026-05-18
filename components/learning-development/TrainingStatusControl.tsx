"use client";

import { useEffect, useState } from "react";
import { useUpdateTraining } from "@/components/learning-development/hooks/useLearningTrainings";
import { StatusBadge } from "@/components/learning-development/ui/forms";

export const TRAINING_STATUS_OPTIONS = [
  "DRAFT",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TrainingStatusOption = (typeof TRAINING_STATUS_OPTIONS)[number];

export function TrainingStatusControl({
  trainingId,
  currentStatus,
  canEdit,
}: {
  trainingId: string;
  currentStatus: string;
  canEdit: boolean;
}) {
  const normalized = String(currentStatus ?? "DRAFT").trim().toUpperCase() || "DRAFT";
  const [draft, setDraft] = useState(normalized);
  const updateMut = useUpdateTraining(trainingId);

  useEffect(() => {
    setDraft(normalized);
  }, [normalized]);

  if (!canEdit) {
    return <StatusBadge status={normalized} />;
  }

  async function applyStatus() {
    if (draft === normalized) return;
    await updateMut.mutateAsync({ status: draft });
  }

  return (
    <details className="relative group">
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2 rounded-lg border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm font-medium text-wt-text hover:bg-wt-surface-3">
          Status
          <StatusBadge status={normalized} />
        </span>
      </summary>
      <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-56 rounded-xl border border-wt-border bg-wt-surface-1 p-3 shadow-lg">
        <p className="text-xs text-wt-text-muted mb-2">Change training status</p>
        <select
          className="input-field w-full px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={updateMut.isPending}
        >
          {TRAINING_STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-primary mt-2 w-full px-3 py-2 text-sm"
          disabled={updateMut.isPending || draft === normalized}
          onClick={() => applyStatus().catch((e) => alert(e instanceof Error ? e.message : "Unable to update status"))}
        >
          {updateMut.isPending ? "Saving…" : "Apply"}
        </button>
      </div>
    </details>
  );
}
