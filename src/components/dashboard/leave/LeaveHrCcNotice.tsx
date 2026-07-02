"use client";

import { INNER_PANEL_CLASS } from "@/components/dashboard/ui/uiLayout";
import { LEAVE_HR_CC_EMAILS } from "@/constants/leaveRequest";

export function LeaveHrCcNotice() {
  return (
    <div className={INNER_PANEL_CLASS}>
      <p className="text-sm font-medium text-wt-text">HR Copy</p>
      <p className="mt-1.5 text-sm leading-relaxed text-wt-text-muted">
        Every leave request automatically notifies{" "}
        {LEAVE_HR_CC_EMAILS.map((email, index) => (
          <span key={email}>
            {index > 0 ? " and " : null}
            <a className="text-[var(--wt-brand)] hover:underline" href={`mailto:${email}`}>
              {email}
            </a>
          </span>
        ))}
        .
      </p>
    </div>
  );
}
