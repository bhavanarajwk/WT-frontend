"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { useBenchForecastList } from "@/hooks/allocation/useBenchForecastList";
import { buildAllocateHref, formatTalentPoolDate } from "@/utils/talentPool";

const PAGE_SIZE = 50;
const DEFAULT_DAYS = 30;

export function BenchForecastPageClient() {
  const { user, status: authStatus } = useAuth();
  const roles = user?.roles ?? [];
  const canView = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");
  const queriesEnabled = authStatus === "authenticated" && canView;

  const [daysInput, setDaysInput] = useState(String(DEFAULT_DAYS));
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useBenchForecastList(
    queriesEnabled,
    { days, page, size: PAGE_SIZE, search }
  );

  const items = data?.items ?? [];
  const totalPages = Math.max(1, data?.total_pages ?? 1);

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
          <p className="mt-2 text-sm text-wt-text-muted">
            Bench forecast is available to HR and admin only.
          </p>
          <Link
            href={DASHBOARD_ROUTES.overview}
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            Back to overview
          </Link>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <div className="rounded-xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-wt-border px-5 py-5 md:px-7">
          <div>
            <h3 className="text-lg font-semibold">Bench forecast</h3>
            <p className="mt-1 text-sm text-wt-text-muted">
              Upcoming project roll-offs who may need BENCH capacity (not the current talent pool
              list).
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="block text-xs text-wt-text-muted mb-1">Days ahead</span>
              <input
                type="number"
                min={1}
                max={3650}
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="w-24 rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-wt-text-muted mb-1">Search</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-52 rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm"
                placeholder="Name, email, emp id"
              />
            </label>
            <button
              type="button"
              className="rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm"
              onClick={() => {
                const n = Math.max(1, Math.min(3650, Number(daysInput) || DEFAULT_DAYS));
                setDays(n);
                setSearch(searchInput.trim());
                setPage(0);
              }}
            >
              Apply
            </button>
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5 md:p-7">
          <p className="text-xs text-wt-text-muted">
            {isLoading || isFetching
              ? "Loading…"
              : `${data?.total_elements ?? items.length} upcoming roll-off(s) in ${days} days`}
          </p>

          {isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Could not load bench forecast.
              {error instanceof Error ? ` ${error.message}` : ""}
            </div>
          ) : items.length ? (
            <>
              <div className="wt-scroll-both max-h-[min(70vh,560px)] rounded-xl border border-wt-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-wt-surface-2 text-wt-text-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Project</th>
                      <th className="text-left px-3 py-2 font-medium">Role</th>
                      <th className="text-left px-3 py-2 font-medium">End date</th>
                      <th className="text-left px-3 py-2 font-medium">Expected BENCH %</th>
                      <th className="text-left px-3 py-2 font-medium">Managers</th>
                      <th className="text-right px-3 py-2 font-medium">Allocate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={`${row.email}-${row.allocation_end_date}`} className="border-t border-wt-border">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-medium">{row.name || "—"}</span>
                          {row.emp_id ? (
                            <span className="block text-xs text-wt-text-muted">{row.emp_id}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.project_name ?? "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.role ?? "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatTalentPoolDate(row.allocation_end_date)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.expected_bench_hours != null ? `${row.expected_bench_hours}%` : "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.manager_names.length ? row.manager_names.join(", ") : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            href={buildAllocateHref({
                              employee_email: row.email,
                              allocate_employee_email: row.allocate_employee_email,
                            })}
                            className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-indigo-700 hover:bg-indigo-100"
                            title={`Allocate ${row.name || row.email}`}
                            aria-label={`Allocate ${row.name || row.email}`}
                          >
                            <AllocateIcon />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-wt-text-muted">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 0 || isFetching}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={page + 1 >= totalPages || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-wt-text-muted">
              {isLoading ? "Loading…" : "No upcoming roll-offs in this window."}
            </p>
          )}
        </div>
      </div>
    </DashboardPageShell>
  );
}

function AllocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
