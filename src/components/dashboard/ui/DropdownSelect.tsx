"use client";

import type { SearchableSelectOption } from "@/components/dashboard/ui/SearchableSelectCombobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function ChevronDownIcon() {
  return null;
}

export function DropdownSelect({
  value,
  onChange,
  options,
  disabled = false,
  loading = false,
  loadingLabel = "Loading…",
  required = false,
  className = "",
  selectClassName,
  id,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  required?: boolean;
  className?: string;
  selectClassName?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const selected = options.find((opt) => opt.value === value) ?? null;
  const isDisabled = disabled || loading;

  return (
    <Select
      value={selected}
      onValueChange={(item) => onChange(item?.value ?? "")}
      disabled={isDisabled}
      items={options}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-busy={loading || undefined}
        className={cn(selectClassName, className, loading ? "text-wt-text-muted" : undefined)}
      >
        <SelectValue placeholder={loading ? loadingLabel : "Select"} />
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <div className="px-2 py-2 text-sm text-wt-text-muted">{loadingLabel}</div>
        ) : (
          options.map((opt) => (
            <SelectItem key={opt.value || `opt-${opt.label}`} value={opt}>
              {opt.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
