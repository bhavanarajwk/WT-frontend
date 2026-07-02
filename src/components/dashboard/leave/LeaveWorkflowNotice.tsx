"use client";

import {
  INFO_BANNER_BODY_CLASS,
  INFO_BANNER_CLASS,
  INFO_BANNER_TITLE_CLASS,
} from "@/components/dashboard/ui/uiLayout";

export function LeaveWorkflowNotice({
  variant,
  scope = "team",
}: {
  variant: "employee" | "manager" | "dm" | "hr";
  scope?: "team" | "org";
}) {
  const copy: Record<typeof variant, { title: string; body: string }> = {
    employee: {
      title: "Leave Request",
      body: "Select one or more managers to notify by email. You can optionally add other employees as notification recipients. Manager approval in Leave Requests is final—there is no HR final approval step.",
    },
    manager: {
      title: "Leave Request",
      body: "Select managers to notify when you submit leave. Optional additional recipients receive the same notification email at their work address.",
    },
    dm: {
      title: "Team Leave Requests",
      body: "Review and approve or reject leave requests from managers on your team. Manager approval is final for employee leave.",
    },
    hr: {
      title: scope === "org" ? "All Employee Leave Requests" : "Team Leave Requests",
      body:
        scope === "org"
          ? "Search and filter leave requests across the organization. Managers approve employee leave in Leave Requests; HR does not perform a separate final approval step."
          : "Review and approve or reject leave requests from employees on your team. Manager approval is final for employee leave.",
    },
  };

  const { title, body } = copy[variant];

  return (
    <div className={INFO_BANNER_CLASS}>
      <p className={INFO_BANNER_TITLE_CLASS}>{title}</p>
      <p className={INFO_BANNER_BODY_CLASS}>{body}</p>
    </div>
  );
}
