"use client";

import { SearchableSelectCombobox } from "@/components/dashboard/ui/SearchableSelectCombobox";
import type { ListSortOptionMeta } from "@/utils/listSort";

export function ListSortSelect({
  value,
  onChange,
  options,
  label = "Sort by",
  className = "",
  disabled = false,
}: {
  value: string;
  onChange: (sortId: string) => void;
  options: ListSortOptionMeta[];
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  if (!options.length) return null;

  return (
    <label
      className={`flex min-w-[min(100%,220px)] flex-col gap-1 text-xs text-wt-text-muted ${className}`.trim()}
    >
      {label}
      <SearchableSelectCombobox
        value={value}
        onChange={onChange}
        disabled={disabled}
        options={options.map((opt) => ({ value: opt.id, label: opt.label }))}
        placeholder="Search sort…"
        aria-label={label}
      />
    </label>
  );
}

export function sortOptionMeta<T>(options: Array<{ id: string; label: string }>): ListSortOptionMeta[] {
  return options.map(({ id, label }) => ({ id, label }));
}
