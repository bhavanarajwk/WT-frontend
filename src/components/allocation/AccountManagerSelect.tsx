"use client";

import { useMemo } from "react";
import { useOnboardAccountManagers } from "@/hooks/learning/useLearningTrainerDirectory";
import { FieldLabel, SearchableSelectCombobox } from "@/components/dashboard/ui/forms";
import { onboardOptionEmail } from "@/utils/learning/onboardOptions";

export function AccountManagerSelect({
  value,
  onChange,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const { data: options = [], isLoading, isError } = useOnboardAccountManagers();

  const selectOptions = useMemo(() => {
    const placeholder = isLoading
      ? "Loading account managers…"
      : isError
        ? "Could not load list"
        : options.length
          ? "Select account manager"
          : "No account managers found";
    const rows = options
      .map((opt) => {
        const email = onboardOptionEmail(opt);
        if (!email) return null;
        return { value: email, label: opt.label };
      })
      .filter((row): row is { value: string; label: string } => Boolean(row));
    return [{ value: "", label: placeholder }, ...rows];
  }, [options, isLoading, isError]);

  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      <FieldLabel label="Account manager" required={required} />
      <SearchableSelectCombobox
        value={value}
        onChange={onChange}
        options={selectOptions}
        placeholder="Search account managers…"
        required={required}
        disabled={isLoading}
        aria-label="Account manager"
      />
    </label>
  );
}
