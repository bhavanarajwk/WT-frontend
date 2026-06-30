"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyLeaveBalance } from "@/hooks/leave/useMyLeaveBalance";
import { formatBalanceDays } from "@/utils/leaveRequestDisplay";
import { CalendarDays, RotateCcw, User, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function BalanceStatCard({
  label,
  amount,
  unit,
  icon: Icon,
  className,
}: {
  label: string;
  amount: string;
  unit: string;
  icon: LucideIcon;
  className: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-wt-border/70 p-4 shadow-sm ${className}`}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-wt-text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-wt-text">
          {amount}
          <span className="ml-1.5 text-base font-medium text-wt-text-muted">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function BalanceCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-wt-border p-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="mt-3 h-4 w-24" />
          <Skeleton className="mt-2 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function LeaveBalanceSummary({ enabled = true }: { enabled?: boolean }) {
  const { data, isLoading, isError, refetch } = useMyLeaveBalance({ enabled });

  if (isLoading) {
    return <BalanceCardsSkeleton />;
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <BalanceStatCard
        label="Total Available"
        {...formatBalanceDays(total)}
        icon={CalendarDays}
        className="bg-sky-50 text-sky-700"
      />
      <BalanceStatCard
        label="Primary"
        {...formatBalanceDays(primary)}
        icon={User}
        className="bg-emerald-50 text-emerald-700"
      />
      <BalanceStatCard
        label="Secondary"
        {...formatBalanceDays(secondary)}
        icon={Users}
        className="bg-violet-50 text-violet-700"
      />
      <BalanceStatCard
        label="Carry Forward"
        {...formatBalanceDays(carry_forward)}
        icon={RotateCcw}
        className="bg-amber-50 text-amber-800"
      />
    </div>
  );
}
