"use client";

import type { SearchableSelectOption } from "@/components/dashboard/ui/SearchableSelectCombobox";
import { FORM_CONTROL_WITH_CHEVRON_CLASS } from "@/components/dashboard/ui/uiLayout";

export function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function DropdownSelect({
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  className = "",
  selectClassName = FORM_CONTROL_WITH_CHEVRON_CLASS,
  id,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  selectClassName?: string;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={`relative ${className}`.trim()}>
      <select
        id={id}
        className={selectClassName}
        value={value}
        disabled={disabled}
        required={required}
        aria-required={required || undefined}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-wt-text-muted"
        aria-hidden
      >
        <ChevronDownIcon />
      </span>
    </div>
  );
}
