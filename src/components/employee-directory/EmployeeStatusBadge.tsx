"use client";

import {
  formatEmployeeStatusLabel,
  getEmployeeStatusBadgeClassName,
  normalizeEmployeeStatusKey,
} from "@/utils/userStatus";

export function EmployeeStatusBadge({ status }: { status: string }) {
  const key = normalizeEmployeeStatusKey(status);
  if (!key) {
    return <span className="text-sm text-wt-text-muted">—</span>;
  }

  const label = formatEmployeeStatusLabel(status);

  return (
    <span className={getEmployeeStatusBadgeClassName(status)} role="status" aria-label={`Status: ${label}`}>
      {label}
    </span>
  );
}
