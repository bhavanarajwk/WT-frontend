"use client";

import { Badge } from "@/components/ui/badge";
import { filledBadgeClass } from "@/components/dashboard/ui/badgeTones";
import { formatMaterialVisibility } from "@/utils/learning/materialVisibility";

function materialVisibilityTone(value: unknown): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "EMPLOYEE") return filledBadgeClass("info");
  if (normalized === "HR_ONLY") return filledBadgeClass("violet");
  return filledBadgeClass("neutral");
}

export function MaterialVisibilityBadge({ value }: { value: unknown }) {
  return (
    <Badge variant="secondary" className={materialVisibilityTone(value)}>
      {formatMaterialVisibility(value)}
    </Badge>
  );
}
