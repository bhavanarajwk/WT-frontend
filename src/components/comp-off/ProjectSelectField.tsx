"use client";

import { FieldLabel } from "@/components/dashboard/ui/forms";
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
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      <FieldLabel label={label} required={required} />
      <select
        className="input-field px-3 py-2 text-sm"
        value={value}
        disabled={disabled}
        required={required}
        aria-required={required || undefined}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select project</option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
