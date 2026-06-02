"use client";

import { useMemo } from "react";
import { FieldLabel, SearchableSelectCombobox } from "@/components/dashboard/ui/forms";
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

  const options = useMemo(() => {
    const rows = trainings.map((row) => {
      const id = String(row.id ?? "").trim();
      const name = String(row.name ?? id).trim();
      return { value: id, label: name || id };
    });
    return [
      { value: "", label: isLoading ? "Loading…" : "Select a training" },
      ...rows.filter((row) => row.value),
    ];
  }, [trainings, isLoading]);

  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1 max-w-xl">
      <FieldLabel label="Training name" required={required} />
      <SearchableSelectCombobox
        value={trainingId}
        onChange={onTrainingIdChange}
        options={options}
        placeholder="Search trainings…"
        required={required}
        disabled={isLoading}
        aria-label="Training name"
      />
    </label>
  );
}
