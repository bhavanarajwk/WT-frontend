"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useExitInterviewSubmissions } from "@/hooks/exit-interview/useExitInterviewSubmissions";
const STATUS_OPTIONS: Array<{ value: "SUBMITTED" | "PENDING" | "ALL"; label: string }> = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PENDING", label: "Pending" },
  { value: "ALL", label: "All" },
];

export function ExitInterviewSubmissionsPageClient() {
  const { hasHrAccess, userRoles } = useDashboardAccess();
  const canView = hasHrAccess || userRoles.includes("ROLE_ADMIN");

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<"SUBMITTED" | "PENDING" | "ALL">("SUBMITTED");

  const listQ = useExitInterviewSubmissions(
    { page, size, search, status },
    { enabled: canView }
  );

  const totalPages = useMemo(() => {
    const total = listQ.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / size));
  }, [listQ.data?.total, size]);

  if (!canView) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted">
          Exit interview submissions are available to HR and admin only.
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="border-b border-wt-border px-5 py-5 md:px-7 md:py-6">
          <h3 className="text-lg font-semibold">Exit interview submissions</h3>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex min-w-[min(100%,240px)] flex-1 flex-col gap-1 text-xs text-wt-text-muted">
              Search
              <input
                className="input-field px-3 py-2 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name, email, or employee ID"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(0);
                    setSearch(searchInput.trim());
                  }
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-wt-text-muted">
              Status
              <select
                className="input-field px-3 py-2 text-sm w-[10.5rem]"
                value={status}
                onChange={(e) => {
                  setPage(0);
                  setStatus(e.target.value as "SUBMITTED" | "PENDING" | "ALL");
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-primary px-3 py-2 text-sm"
              onClick={() => {
                setPage(0);
                setSearch(searchInput.trim());
              }}
            >
              Apply
            </button>
          </div>
        </div>

        <div className="p-5 md:p-7">
          {listQ.isLoading ? <p className="text-sm text-wt-text-muted">Loading submissions…</p> : null}

          {listQ.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Could not load submissions.
              {listQ.error instanceof Error ? ` ${listQ.error.message}` : ""}
            </div>
          ) : null}

          {!listQ.isLoading && !listQ.isError && !(listQ.data?.items.length ?? 0) ? (
            <p className="text-sm text-wt-text-muted">No submissions match your filters.</p>
          ) : null}

          {(listQ.data?.items.length ?? 0) > 0 ? (
            <>
              <div className="wt-scroll-both overflow-auto rounded-xl border border-wt-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-wt-surface-2 text-wt-text-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase" />
                    </tr>
                  </thead>
                  <tbody>
                    {listQ.data?.items.map((row) => {
                      const empId = String(row.emp_id ?? "").trim();
                      const isSubmitted = row.submission_status === "SUBMITTED";
                      return (
                        <tr key={`${empId}-${row.email}`} className="border-t border-wt-border">
                          <td className="px-4 py-3 font-medium text-wt-text">{row.employee_name}</td>
                          <td className="px-4 py-3 text-wt-text-muted">{row.department ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                isSubmitted
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-amber-50 text-amber-900"
                              }`}
                            >
                              {row.submission_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isSubmitted && empId ? (
                              <Link
                                href={`${DASHBOARD_ROUTES["exit-interview-submissions"]}/${encodeURIComponent(empId)}`}
                                className="text-sm text-indigo-600 hover:underline"
                              >
                                View
                              </Link>
                            ) : (
                              <span className="text-xs text-wt-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-wt-text-muted">
                <span>
                  Page {page + 1} of {totalPages} · {listQ.data?.total ?? 0} total
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5 text-xs"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5 text-xs"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}
