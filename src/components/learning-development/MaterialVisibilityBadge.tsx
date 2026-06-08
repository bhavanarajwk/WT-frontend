"use client";

import { formatMaterialVisibility } from "@/utils/learning/materialVisibility";

export function MaterialVisibilityBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? "").trim().toUpperCase();
  const tone =
    normalized === "EMPLOYEE"
      ? "bg-sky-500/15 text-sky-800 border-sky-500/30"
      : normalized === "HR_ONLY"
        ? "bg-violet-500/15 text-violet-800 border-violet-500/30"
        : "bg-wt-surface-2 text-wt-text-muted border-wt-border";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}
    >
      {formatMaterialVisibility(value)}
    </span>
  );
}
