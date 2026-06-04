"use client";

import { FieldLabel, SearchableSelectCombobox } from "@/components/dashboard/ui/forms";
import type { CompOffProjectOption } from "@/utils/compOffProjects";

export function ProjectSelectField({
  label,
  value,
  options,
  onChange,
  disabled,
  required = false,
}: {
  label: string;
  value: string;
  options: CompOffProjectOption[];
  onChange: (projectCode: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const selectOptions = [
    { value: "", label: "Select project" },
    ...options.map((opt) => ({ value: opt.code, label: opt.label })),
  ];

  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      <FieldLabel label={label} required={required} />
      <SearchableSelectCombobox
        value={value}
        onChange={onChange}
        options={selectOptions}
        placeholder="Search projects…"
        required={required}
        disabled={disabled}
        aria-label={label}
      />
    </label>
  );
}
