"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { useBenchForecast } from "@/hooks/allocation/useBenchForecast";
import { formatResumeCellValue } from "@/utils/employeeResume";

const HIDDEN_COLUMNS = new Set([
  "manager_names",
  "managerNames",
  "manager_name",
  "managerName",
]);

function labelizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function BenchForecastPageClient() {
  const { user, status: authStatus } = useAuth();
  const [days, setDays] = useState("10");
  const [appliedDays, setAppliedDays] = useState(10);

  const roles = user?.roles ?? [];
  const canView = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");
  const queriesEnabled = authStatus === "authenticated" && canView;

  const { data, isLoading, isError, error, refetch, isFetching } = useBenchForecast(
    appliedDays,
    queriesEnabled
  );

  const rows = data?.rows ?? [];
  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows) {
      Object.keys(row).forEach((k) => {
        if (!HIDDEN_COLUMNS.has(k)) keys.add(k);
      });
    }
    return [...keys].sort();
  }, [rows]);

  if (authStatus === "loading") {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted">
          Loading…
        </div>
      </DashboardPageShell>
    );
  }

  if (!canView) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 shadow-sm">
          <h3 className="text-lg font-semibold">Access restricted</h3>
          <p className="mt-2 text-sm text-wt-text-muted">Bench forecast is available to HR and admin only.</p>
          <Link href={DASHBOARD_ROUTES.overview} className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Back to overview
          </Link>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <div className="rounded-xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="border-b border-wt-border px-5 py-5 md:px-7">
          <h3 className="text-lg font-semibold">Bench days forecasting</h3>
        </div>

        <div className="space-y-4 p-5 md:p-7">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-wt-text-muted">
              Forecast window (days)
              <input
                type="number"
                min={1}
                max={365}
                className="input-field w-32 px-3 py-2 text-sm"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              disabled={isFetching}
              onClick={() => setAppliedDays(Math.max(1, Number(days) || 10))}
            >
              Load forecast
            </button>
            <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => void refetch()}>
              Refresh
            </button>
          </div>

          {isLoading || isFetching ? (
            <p className="text-sm text-wt-text-muted">Loading bench forecast…</p>
          ) : null}

          {isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Could not load forecast.{error instanceof Error ? ` ${error.message}` : ""}
            </div>
          ) : null}

          {!isLoading && !isError && rows.length > 0 ? (
            <div className="wt-scroll-both max-h-[min(65vh,560px)] overflow-auto rounded-lg border border-wt-border">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-[1] bg-wt-surface-2 text-wt-text-muted">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase">
                        {labelizeKey(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-wt-border">
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      {columns.map((col) => (
                        <td key={col} className="whitespace-nowrap px-4 py-3">
                          {formatResumeCellValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!isLoading && !isError && !rows.length ? (
            <p className="text-sm text-wt-text-muted">No bench forecast data for the selected window.</p>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}
