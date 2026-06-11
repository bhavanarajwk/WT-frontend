"use client";

export function LeaveWorkflowNotice({
  variant,
}: {
  variant: "employee" | "manager" | "dm" | "hr" | "hr-dual-required";
}) {
  const copy: Record<typeof variant, { title: string; body: string }> = {
    employee: {
      title: "Approval workflow",
      body: "Your request goes to your project manager first, then HR for final approval. Leave is deducted only after HR approves.",
    },
    manager: {
      title: "Approval workflow",
      body: "Your leave is reviewed by a Delivery Manager first, then HR finalizes and deducts balance.",
    },
    dm: {
      title: "Delivery Manager review",
      body: "Approve or reject manager leave/WFH requests. HR must approve after you to finalize and deduct leave.",
    },
    hr: {
      title: "HR final approval",
      body: "First-line manager or DM must approve before you can finalize leave/WFH. Final approval deducts leave balance.",
    },
    "hr-dual-required": {
      title: "HR employee leave",
      body: "Your leave requires approval from a user with both HR and Admin roles before it is finalized.",
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
