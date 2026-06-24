"use client";

import { Badge } from "@/components/ui/badge";
import { filledBadgeClass } from "@/components/dashboard/ui/badgeTones";

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

function enrollmentStatusTone(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "COMPLETED") return filledBadgeClass("success");
  if (normalized === "WITHDRAWN") return filledBadgeClass("warning");
  if (normalized === "ENROLLED") return filledBadgeClass("info");
  return filledBadgeClass("neutral");
}

export function EnrollmentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={enrollmentStatusTone(status)}>
      {formatEnrollmentStatusLabel(status)}
    </Badge>
  );
}
