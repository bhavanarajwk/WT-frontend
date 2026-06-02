"use client";

import { useOnboardAccountManagers } from "@/hooks/learning/useLearningTrainerDirectory";
import { FieldLabel } from "@/components/dashboard/ui/forms";
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

  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      <FieldLabel label="Account manager" required={required} />
      <select
        className="input-field px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        required={required}
        aria-required={required || undefined}
      >
        <option value="">
          {isLoading
            ? "Loading account managers…"
            : isError
              ? "Could not load list"
              : options.length
                ? "Select account manager"
                : "No account managers found"}
        </option>
        {options.map((opt) => {
          const email = onboardOptionEmail(opt);
          if (!email) return null;
          return (
            <option key={opt.id} value={email}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
