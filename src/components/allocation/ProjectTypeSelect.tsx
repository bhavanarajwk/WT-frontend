"use client";

import { useMemo } from "react";
import { SelectField, type SelectFieldOption } from "@/components/dashboard/ui/forms";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import { projectTypeSelectOptions } from "@/utils/projectTypes";

/** Create Project — options from GET /project/types (`code` stored, `label` shown e.g. Projects). */
export function ProjectTypeSelect({
  value,
  onChange,
  required = false,
  activeOnly = true,
  enabled = true,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** When true, only types valid for new projects (API activeOnly). */
  activeOnly?: boolean;
  enabled?: boolean;
  disabled?: boolean;
}) {
  const { data: types = [], isLoading, isError } = useProjectTypes(activeOnly, enabled);

  const options: SelectFieldOption[] = useMemo(() => {
    if (isLoading) {
      return [{ value: "", label: "Loading project types…" }];
    }
    if (isError) {
      return [{ value: "", label: "Could not load project types" }];
    }
    if (!types.length) {
      return [{ value: "", label: "No project types configured" }];
    }
    return projectTypeSelectOptions(types);
  }, [types, isLoading, isError]);

  const validCodes = useMemo(() => new Set(types.map((t) => t.code)), [types]);

  return (
    <SelectField
      label="Project Type"
      placeholder="Select project type"
      required={required}
      value={value}
      options={options}
      disabled={disabled || isLoading || isError || !types.length}
      onChange={(v) => onChange(validCodes.has(v) ? v : "")}
    />
  );
}
