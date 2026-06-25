"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyLeaveBalance } from "@/hooks/leave/useMyLeaveBalance";

function BalanceTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-wt-border bg-wt-surface-2 px-3 py-2.5">
      <p className="text-xs text-wt-text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function BalanceTilesSkeleton() {
  return (
    <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-4 space-y-3" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-wt-border bg-wt-surface-2 px-3 py-2.5 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeaveBalanceSummary() {
  const { data, isLoading, isError, refetch } = useMyLeaveBalance();

  if (isLoading) {
    return <BalanceTilesSkeleton />;
  }

  if (isError) {
    return (
      <p className="text-sm text-rose-700">
        Could not load leave balance.{" "}
        <Button type="button" variant="link" className="h-auto p-0 underline" onClick={() => void refetch()}>
          Retry
        </Button>
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
