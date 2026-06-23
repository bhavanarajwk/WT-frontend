"use client";

import { Button } from "@/components/ui/button";

export type HrToggleStatus = "REJECTED" | "PENDING" | "APPROVED";

const THREE_WAY: { value: HrToggleStatus; label: string }[] = [
  { value: "REJECTED", label: "Reject" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approve" },
];

const TWO_WAY: { value: HrToggleStatus; label: string }[] = [
  { value: "REJECTED", label: "Reject" },
  { value: "APPROVED", label: "Approve" },
];

function activeClasses(value: HrToggleStatus): string {
  if (value === "APPROVED") return "bg-emerald-100 text-emerald-800 border border-emerald-200/80";
  if (value === "REJECTED") return "bg-rose-100 text-rose-800 border border-rose-200/80";
  return "bg-amber-100 text-amber-900 border border-amber-200/80";
}

type HrLeaveStatusToggleProps = {
  value: HrToggleStatus;
  onChange: (value: HrToggleStatus) => void;
  disabled?: boolean;
  loading?: boolean;
  /** LEAVE/WFH: center = PENDING. COMP_OFF HR: approve/reject only. */
  threeWay?: boolean;
};

export function HrLeaveStatusToggle({
  value,
  onChange,
  disabled,
  loading,
  threeWay = true,
}: HrLeaveStatusToggleProps) {
  const options = threeWay ? THREE_WAY : TWO_WAY;
  const isDisabled = disabled || loading;

  return (
    <div
      className="inline-flex rounded-lg border border-wt-border/80 bg-wt-surface-1 p-0.5 gap-0.5"
      role="group"
      aria-label="HR decision"
    >
      {options.map((opt) => {
        const isActive = value === opt.value && options.some((o) => o.value === value);
        return (
          <Button
            key={opt.value}
            type="button"
            variant="ghost"
            size="xs"
            disabled={isDisabled}
            aria-pressed={isActive}
            title={opt.label}
            className={`min-w-[4.5rem] rounded-md px-2 py-1 ${
              isActive ? activeClasses(opt.value) : "text-wt-text-muted hover:bg-wt-surface-1 hover:text-wt-text"
            }`}
            onClick={() => {
              if (!isDisabled && opt.value !== value) onChange(opt.value);
            }}
          >
            {loading && isActive ? "…" : opt.label}
          </Button>
        );
      })}
    </div>
  );
}
