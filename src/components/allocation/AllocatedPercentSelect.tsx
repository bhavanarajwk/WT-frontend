"use client";

import { useMemo } from "react";
import { SelectField, type SelectFieldOption } from "@/components/dashboard/ui/forms";
import { useAllocationPercentages } from "@/hooks/useAllocationPercentages";
import {
  allocationPercentOptionsForDesignation,
  allocationPercentSelectOptions,
  designationAllowsFineAllocationPercent,
} from "@/utils/allocationPercent";

/** Create/update allocation — API % (50/100) or 12.5% steps for designer / tester / PM. */
export function AllocatedPercentSelect({
  designation,
  value,
  onChange,
  required = false,
  enabled = true,
  disabled = false,
}: {
  designation: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  enabled?: boolean;
  disabled?: boolean;
}) {
  const fineGrained = designationAllowsFineAllocationPercent(designation);
  const { data: apiOptions = [], isLoading, isError } = useAllocationPercentages(
    enabled && !fineGrained
  );

  const resolvedOptions = useMemo(
    () => allocationPercentOptionsForDesignation(designation, apiOptions),
    [designation, apiOptions]
  );

  const selectOptions: SelectFieldOption[] = useMemo(() => {
    if (!fineGrained) {
      if (isLoading) {
        return [{ value: "", label: "Loading allocation %…" }];
      }
      if (isError) {
        return [{ value: "", label: "Could not load allocation %" }];
      }
    }
    if (!resolvedOptions.length) {
      return [{ value: "", label: "No allocation % configured" }];
    }
    return allocationPercentSelectOptions(resolvedOptions);
  }, [fineGrained, resolvedOptions, isLoading, isError]);

  const validCodes = useMemo(
    () => new Set(resolvedOptions.map((t) => String(t.code))),
    [resolvedOptions]
  );

  const selectDisabled =
    disabled ||
    (!fineGrained && (isLoading || isError)) ||
    !resolvedOptions.length;

  return (
    <SelectField
      label="Allocated %"
      placeholder={
        fineGrained ? "Select allocation % (12.5% steps)" : "Select allocation %"
      }
      required={required}
      value={value}
      options={selectOptions}
      disabled={selectDisabled}
      onChange={(v) => onChange(validCodes.has(v) ? v : "")}
    />
  );
}
