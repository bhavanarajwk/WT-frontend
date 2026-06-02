"use client";

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
      <select
        className="input-field px-3 py-2 text-sm"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function sortOptionMeta<T>(options: Array<{ id: string; label: string }>): ListSortOptionMeta[] {
  return options.map(({ id, label }) => ({ id, label }));
}
