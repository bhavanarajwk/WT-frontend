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
  required?: boolean;
  className?: string;
  selectClassName?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const selected = options.find((opt) => opt.value === value) ?? null;

  return (
    <Select
      value={selected}
      onValueChange={(item) => onChange(item?.value ?? "")}
      disabled={disabled}
      items={options}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        className={cn(selectClassName, className)}
      >
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value || `opt-${opt.label}`} value={opt}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
