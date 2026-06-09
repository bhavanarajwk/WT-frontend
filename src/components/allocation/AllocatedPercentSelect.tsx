"use client";

import { useMemo } from "react";
import { SelectField, type SelectFieldOption } from "@/components/dashboard/ui/forms";
import { useAllocationPercentages } from "@/hooks/useAllocationPercentages";
import {
  allocationPercentSelectOptions,
} from "@/utils/allocationPercent";

/** Create/update allocation — options from GET /allocation/percentages for the selected role. */
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
  const role = designation.trim();
  const { data: apiOptions = [], isLoading, isError } = useAllocationPercentages(
    role,
    enabled
  );

  const selectOptions: SelectFieldOption[] = useMemo(() => {
    if (!role) {
      return [{ value: "", label: "Select project role first" }];
    }
    if (isLoading) {
      return [{ value: "", label: "Loading allocation %…" }];
    }
    if (isError) {
      return [{ value: "", label: "Could not load allocation %" }];
    }
    if (!apiOptions.length) {
      return [{ value: "", label: "No allocation % configured" }];
    }
    return allocationPercentSelectOptions(apiOptions);
  }, [apiOptions, isError, isLoading, role]);

  const validCodes = useMemo(
    () => new Set(apiOptions.map((t) => String(t.code))),
    [apiOptions]
  );

  return (
    <SelectField
      label="Allocated %"
      placeholder={role ? "Select allocation %" : "Select project role first"}
      required={required}
      value={value}
      options={selectOptions}
      disabled={disabled || !role || isLoading || isError || !apiOptions.length}
      onChange={(v) => onChange(validCodes.has(v) ? v : "")}
    />
  );
}
