"use client";

export function LeaveWorkflowNotice({
  variant,
}: {
  variant: "employee" | "manager" | "dm" | "hr" | "hr-dual-required";
}) {
  const copy: Record<typeof variant, { title: string; body: string }> = {
    employee: {
      title: "Phase 1 Leave Workflow",
      body: "Select one or more managers when you submit leave. WebTrak emails them immediately. Approval and rejection are handled outside the application in Phase 1.",
    },
    manager: {
      title: "Phase 1 Leave Workflow",
      body: "Select managers to notify by email when you submit leave. In-app approval and rejection are not used for leave in Phase 1.",
    },
    dm: {
      title: "Phase 1 Leave Workflow",
      body: "Leave requests are emailed to selected managers. Approve and reject actions for leave are not available in WebTrak during Phase 1.",
    },
    hr: {
      title: "Phase 1 Leave Workflow",
      body: "Employee leave requests are emailed to selected managers. HR finalize actions for leave are disabled in WebTrak during Phase 1.",
    },
    "hr-dual-required": {
      title: "Phase 1 Leave Workflow",
      body: "Select managers to notify by email. Leave approval is handled outside WebTrak during Phase 1.",
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
