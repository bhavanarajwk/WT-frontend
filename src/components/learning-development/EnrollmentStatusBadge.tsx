"use client";

export function formatEnrollmentStatusLabel(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === "COMPLETED") return "Completed";
  if (s === "WITHDRAWN") return "Withdrawn";
  if (s === "ENROLLED") return "Enrolled";
  if (!s || s === "—") return "Enrolled";
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EnrollmentStatusBadge({ status }: { status: string }) {
  const normalized = status.trim().toUpperCase();
  const tone =
    normalized === "COMPLETED"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
      : normalized === "WITHDRAWN"
        ? "bg-amber-500/15 text-amber-900 border-amber-500/30"
        : normalized === "ENROLLED"
          ? "bg-sky-500/15 text-sky-800 border-sky-500/30"
          : "bg-wt-surface-2 text-wt-text-muted border-wt-border";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}
    >
      {formatEnrollmentStatusLabel(status)}
    </span>
  );
}
