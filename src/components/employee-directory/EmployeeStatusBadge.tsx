"use client";

export function EmployeeStatusBadge({ status }: { status: string }) {
  const normalized = String(status ?? "").trim().toUpperCase() || "—";
  const isActive = normalized === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
        isActive
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-wt-surface-2 text-wt-text-muted border border-wt-border"
      }`}
    >
      {normalized}
    </span>
  );
}
