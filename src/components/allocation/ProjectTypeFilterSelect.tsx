"use client";

import { useMemo } from "react";
import { SelectField, type SelectFieldOption } from "@/components/dashboard/ui/forms";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import { projectTypeFilterOptions } from "@/utils/projectTypes";

export function ProjectTypeFilterSelect({
  value,
  onChange,
  enabled = true,
}: {
  value: string;
  onChange: (value: string) => void;
  enabled?: boolean;
}) {
  const { data: types = [], isLoading, isError } = useProjectTypes(false, enabled);

  const options: SelectFieldOption[] = useMemo(() => {
    if (isLoading) {
      return [{ value: "ALL", label: "Loading types…" }];
    }
    if (isError || !types.length) {
      return [{ value: "ALL", label: "All types" }];
    }
    return projectTypeFilterOptions(types);
  }, [types, isLoading, isError]);

  return (
    <SelectField
      label="Type Filter"
      value={value || "ALL"}
      options={options}
      disabled={isLoading}
      onChange={(v) => onChange(v || "ALL")}
    />
  );
}
