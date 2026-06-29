"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { useEmployeeLeaveBalances } from "@/hooks/employee-directory/useEmployeeLeaveBalances";

function BalanceStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-lg border border-wt-border bg-wt-surface-2/50 px-3 py-3 text-center">
      <p className="text-xs font-medium text-wt-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums leading-none text-wt-text">
        {value}
      </p>
    </div>
  );
}

export function EmployeeLeaveBalancesCard({
  empId,
  enabled = true,
}: {
  empId: string;
  enabled?: boolean;
}) {
  const { data, isLoading, isError, error, refetch } = useEmployeeLeaveBalances(empId, { enabled });

  return (
    <Card className="w-full p-0">
      <CardHeader className="px-5 py-3 sm:px-6">
        <CardTitle className="text-base">Leave & Comp-Off Balances</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="px-5 py-3 sm:px-6">
        {isLoading ? <SectionLoading label="Loading balances…" /> : null}

        {isError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            Could not load balances.{error instanceof Error ? ` ${error.message}` : ""}
            <Button
              variant="ghost"
              size="xs"
              type="button"
              className="mt-2 px-2 py-1 text-xs"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && data ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <BalanceStat label="Primary Leave" value={data.leave?.primary ?? 0} />
            <BalanceStat label="Secondary Leave" value={data.leave?.secondary ?? 0} />
            <BalanceStat label="Carry Forward" value={data.leave?.carry_forward ?? 0} />
            <BalanceStat label="Total Available" value={data.leave?.total ?? 0} />
            <BalanceStat label="Comp Off" value={data.comp_off_balance ?? 0} />
          </div>
        ) : null}

        {!isLoading && !isError && !data ? (
          <p className="text-sm text-wt-text-muted">No balance data available.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
