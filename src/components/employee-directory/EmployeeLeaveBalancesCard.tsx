"use client";

import { useEmployeeLeaveBalances } from "@/hooks/employee-directory/useEmployeeLeaveBalances";

function BalanceItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-wt-border bg-wt-surface-1 px-4 py-3">
      <p className="text-xs text-wt-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-wt-text">{value}</p>
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
    <section className="rounded-xl border border-wt-border bg-wt-surface-1 shadow-sm">
      <div className="border-b border-wt-border px-5 py-4 md:px-6">
        <h4 className="text-base font-semibold">Leave & comp-off balances</h4>
        <p className="mt-0.5 text-sm text-wt-text-muted">Current balance snapshot for this employee.</p>
      </div>

      <div className="p-5 md:p-6">
        {isLoading ? (
          <p className="text-sm text-wt-text-muted">Loading balances…</p>
        ) : null}

        {isError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            Could not load balances.{error instanceof Error ? ` ${error.message}` : ""}
            <button type="button" className="btn-ghost mt-2 px-2 py-1 text-xs" onClick={() => void refetch()}>
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && data ? (
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <BalanceItem label="Total leave" value={data.leave?.total ?? 0} />
            <BalanceItem label="Comp-off balance" value={data.comp_off_balance ?? 0} />
          </div>
        ) : null}

        {!isLoading && !isError && !data ? (
          <p className="text-sm text-wt-text-muted">No balance data available.</p>
        ) : null}
      </div>
    </section>
  );
}
