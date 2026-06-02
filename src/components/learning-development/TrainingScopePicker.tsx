"use client";

import { FieldLabel } from "@/components/dashboard/ui/forms";
import { useHrTrainingsList } from "@/hooks/learning/useLearningTrainings";

/** HR-only training picker (GET /api/v1/trainings). */
export function TrainingScopePicker({
  trainingId,
  onTrainingIdChange,
  required = false,
}: {
  trainingId: string;
  onTrainingIdChange: (id: string) => void;
  required?: boolean;
}) {
  const { data: trainings = [], isLoading } = useHrTrainingsList();

  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1 max-w-xl">
      <FieldLabel label="Training name" required={required} />
      <select
        className="input-field px-3 py-2 text-sm"
        value={trainingId}
        onChange={(e) => onTrainingIdChange(e.target.value)}
        required={required}
        aria-required={required || undefined}
      >
        <option value="">{isLoading ? "Loading…" : "Select a training"}</option>
        {trainings.map((row) => {
          const id = String(row.id ?? "").trim();
          const name = String(row.name ?? id).trim();
          return (
            <option key={id || name} value={id}>
              {name}
            </option>
          );
        })}
      </select>
    </label>
  );
}
