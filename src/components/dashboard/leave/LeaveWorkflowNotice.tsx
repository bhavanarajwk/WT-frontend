"use client";

export function LeaveWorkflowNotice({
  variant,
}: {
  variant: "employee" | "manager" | "dm" | "hr" | "hr-dual-required";
}) {
  const copy: Record<typeof variant, { title: string; body: string }> = {
    employee: {
      title: "Leave request",
      body: "Select one or more managers to approve your leave. You can optionally add employees who should receive the notification email. Manager approval is final.",
    },
    manager: {
      title: "Leave request",
      body: "Select managers when submitting leave. Optional additional recipients receive the same notification email at their work address.",
    },
    dm: {
      title: "Team leave requests",
      body: "Review and approve or reject leave requests from managers on your team. Manager approval is final for employee leave.",
    },
    hr: {
      title: "All employee leave requests",
      body: "Search and review leave requests across the organization. Managers approve employee leave in WebTrak; HR does not perform a separate final approval step.",
    },
    "hr-dual-required": {
      title: "Leave request",
      body: "Select managers to notify. HR-submitted requests follow the HR and Admin dual-approval path.",
    },
  };

  const { title, body } = copy[variant];

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-blue-800/90">{body}</p>
    </div>
  );
}
