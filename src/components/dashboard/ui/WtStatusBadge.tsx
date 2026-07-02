import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { filledBadgeClass } from "@/components/dashboard/ui/badgeTones";
import {
  formatEmployeeStatusLabel,
  getEmployeeStatusTone,
  normalizeEmployeeStatusKey,
  type EmployeeStatusTone,
} from "@/utils/userStatus";

const EMPLOYEE_STATUS_TONE: Record<EmployeeStatusTone, string> = {
  active: filledBadgeClass("success"),
  inactive: filledBadgeClass("danger"),
  invited: filledBadgeClass("neutral"),
  serving_notice: filledBadgeClass("neutral"),
  neutral: filledBadgeClass("neutral"),
};

function formatTrainingStatusLabel(status: string): string {
  const s = status.trim().toUpperCase();
  if (!s) return "—";
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function trainingStatusTone(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === "COMPLETED") return filledBadgeClass("success");
  if (s === "CANCELLED") return filledBadgeClass("danger");
  if (s === "IN_PROGRESS" || s === "SCHEDULED") return filledBadgeClass("info");
  return filledBadgeClass("neutral");
}

export function EmployeeStatusBadge({ status }: { status: string }) {
  const key = normalizeEmployeeStatusKey(status);
  if (!key) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const label = formatEmployeeStatusLabel(status);

  return (
    <Badge
      variant="secondary"
      className={EMPLOYEE_STATUS_TONE[getEmployeeStatusTone(status)]}
      role="status"
      aria-label={`Status: ${label}`}
    >
      {label}
    </Badge>
  );
}

/** Training / session lifecycle statuses in Learning & Development tables. */
export function TrainingStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={trainingStatusTone(status)}>
      {formatTrainingStatusLabel(status)}
    </Badge>
  );
}

/** Generic filled badge for simple status labels in tables. */
export function WtStatusBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(filledBadgeClass("neutral"), className)}>
      {children}
    </Badge>
  );
}
