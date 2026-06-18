"use client";

export function LeaveWorkflowNotice({
  variant,
}: {
  variant: "employee" | "manager" | "dm" | "hr";
}) {
  const copy: Record<typeof variant, { title: string; body: string }> = {
    employee: {
      title: "Leave request",
      body: "Select one or more managers to notify by email. You can optionally add other employees as notification recipients. Manager approval in Team Requests is final—there is no HR final approval step.",
    },
    manager: {
      title: "Leave request",
      body: "Select managers to notify when you submit leave. Optional additional recipients receive the same notification email at their work address.",
    },
    dm: {
      title: "Team leave requests",
      body: "Review and approve or reject leave requests from managers on your team. Manager approval is final for employee leave.",
    },
    hr: {
      title: "All employee leave requests",
      body: "Search and filter leave requests across the organization. Managers approve employee leave in Team Requests; HR does not perform a separate final approval step.",
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
