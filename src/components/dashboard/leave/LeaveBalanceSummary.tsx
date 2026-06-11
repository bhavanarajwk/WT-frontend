"use client";

import { useMyLeaveBalance } from "@/hooks/leave/useMyLeaveBalance";

function BalanceTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-wt-border bg-wt-surface-2 px-3 py-2.5">
      <p className="text-xs text-wt-text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function LeaveBalanceSummary() {
  const { data, isLoading, isError, refetch } = useMyLeaveBalance();

  if (isLoading) {
    return <p className="text-sm text-wt-text-muted">Loading leave balance…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-rose-700">
        Could not load leave balance.{" "}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Retry
        </button>
      </p>
    );
  }

  if (!data?.leave) {
    return null;
  }

  const { primary, secondary, carry_forward, total } = data.leave;

  return (
    <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">Your leave balance</p>
        <p className="text-xs text-wt-text-muted mt-0.5">
          Month-scoped balance used when submitting leave requests.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <BalanceTile label="Primary" value={primary ?? 0} />
        <BalanceTile label="Secondary" value={secondary ?? 0} />
        <BalanceTile label="Carry forward" value={carry_forward ?? 0} />
        <BalanceTile label="Total available" value={total ?? 0} />
      </div>
      {data.comp_off_balance != null ? (
        <p className="text-xs text-wt-text-muted">
          Comp-off balance: <span className="font-medium text-wt-text">{data.comp_off_balance}</span>
        </p>
      ) : null}
    </div>
  );
}
