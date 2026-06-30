import { Info } from "lucide-react";

type LeaveWorkflowNoticeVariant = "employee" | "manager" | "dm" | "hr";
type LeaveWorkflowNoticeScope = "team" | "org";

interface LeaveWorkflowNoticeProps {
  variant: LeaveWorkflowNoticeVariant;
  scope?: LeaveWorkflowNoticeScope;
}

const messages: Record<LeaveWorkflowNoticeVariant, (scope?: LeaveWorkflowNoticeScope) => string> = {
  employee: () =>
    "Your leave request will be submitted to your primary manager for approval. You will be notified once the request is approved or rejected.",
  manager: () =>
    "As a manager, your leave request will go through the standard approval workflow. Depending on your department, it may be reviewed by a delivery manager or HR.",
  dm: () =>
    "Your leave requests are submitted to your manager for approval. You have department manager access to view and manage team requests.",
  hr: (scope) =>
    `You are viewing ${scope === "org" ? "organisation-wide" : "team"} leave requests. Manager approval is required before HR can take final action.`,
};

export function LeaveWorkflowNotice({ variant, scope }: LeaveWorkflowNoticeProps) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-wt-text-muted">
      <Info className="size-3.5 shrink-0" aria-hidden />
      {messages[variant](scope)}
    </p>
  );
}
