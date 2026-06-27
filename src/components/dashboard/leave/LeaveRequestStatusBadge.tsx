import { Badge } from "@/components/ui/badge";
import type { BADGE_TONE } from "@/components/dashboard/ui/badgeTones";
import { filledBadgeClass } from "@/components/dashboard/ui/badgeTones";
import { formatApprovalStageLabel } from "@/utils/userRequest";
import { normalizeRequestStatus } from "@/utils/compOff";

function statusTone(status: string): keyof typeof BADGE_TONE {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "PENDING" || status === "SUBMITTED") return "warning";
  return "neutral";
}

export function LeaveRequestStatusBadge({ status }: { status: unknown }) {
  const normalized = normalizeRequestStatus(status);
  const label = formatApprovalStageLabel(status);
  if (!normalized || label === "—") return <span>—</span>;

  return (
    <Badge variant="secondary" className={filledBadgeClass(statusTone(normalized))}>
      {label}
    </Badge>
  );
}
