"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { useEmployeeResumes } from "@/hooks/resumes/useEmployeeResumes";
import { canViewEmployeeResumes } from "@/utils/roles";
import {
  formatResumeCellValue,
  resumeRowEmpId,
  tableColumnsForResumeRows,
} from "@/utils/employeeResume";
import { EmployeeResumeLinkFromRow } from "@/components/resumes/EmployeeResumeLink";
import { ListSortSelect, sortOptionMeta } from "@/components/dashboard/ui/ListSortSelect";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { useClientPagination } from "@/hooks/useClientPagination";
import { applyListSort, resumeSortOptions } from "@/utils/listSort";

function labelizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ResumesPageClient() {
  const { user, status: authStatus } = useAuth();
  const [search, setSearch] = useState("");
  const [showRawJson, setShowRawJson] = useState(false);
  const [sortId, setSortId] = useState("name_asc");

  const roles = user?.roles ?? [];
  const canView = canViewEmployeeResumes(roles);
  const queriesEnabled = authStatus === "authenticated" && canView;

  const { data, isLoading, isError, error, refetch } = useEmployeeResumes({
    enabled: queriesEnabled,
  });

  const rows = data?.rows ?? [];
  const rawPayload = data?.raw;

  const columns = useMemo(() => tableColumnsForResumeRows(rows), [rows]);

  const sortOptions = useMemo(() => resumeSortOptions(columns), [columns]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = !needle
      ? rows
      : rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
    return applyListSort(filtered, sortId, sortOptions);
  }, [rows, search, sortId, sortOptions]);

  const pagination = useClientPagination(filteredRows, {
    resetKeys: [search, sortId],
  });

  if (authStatus === "loading") {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted shadow-sm">
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
            Resumes are available to account manager users only.
          </p>
          <Link href={DASHBOARD_ROUTES.profile} className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Back to profile
          </Link>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="border-b border-wt-border px-5 py-5 md:px-7 md:py-6">
          <h3 className="text-lg font-semibold">Resumes</h3>
          <p className="mt-1 text-sm text-wt-text-muted">
            Employee resume share links. Click <strong>resume</strong> to open the document.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-1 text-xs text-wt-text-muted">
              Search
              <input
                className="input-field px-3 py-2.5 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, employee ID…"
                aria-label="Search resumes"
              />
            </label>
            {sortOptions.length ? (
              <ListSortSelect
                value={sortId}
                onChange={setSortId}
                options={sortOptionMeta(sortOptions)}
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-4 p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-primary px-3 py-2 text-sm"
              disabled={isLoading}
              onClick={() => void refetch()}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-2 text-sm"
              onClick={() => setShowRawJson((v) => !v)}
            >
              {showRawJson ? "Hide" : "Show"} API response
            </button>
          </div>

          {isLoading ? <p className="text-sm text-wt-text-muted">Loading resumes…</p> : null}

          {isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p>Could not load resumes.{error instanceof Error ? ` ${error.message}` : ""}</p>
              <button type="button" className="btn-ghost mt-3 px-3 py-1.5 text-xs" onClick={() => void refetch()}>
                Retry
              </button>
            </div>
          ) : null}

          {!isLoading && !isError && filteredRows.length > 0 ? (
            <div className="wt-scroll-both max-h-[min(65vh,560px)] overflow-auto rounded-xl border border-wt-border">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-[1] bg-wt-surface-2 text-wt-text-muted">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      >
                        {labelizeKey(col)}
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      Resume
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wt-border">
                  {pagination.pageItems.map((row, idx) => {
                    const empId = resumeRowEmpId(row);
                    return (
                      <tr key={empId || `resume-row-${idx}`}>
                        {columns.map((col) => (
                          <td key={col} className="whitespace-nowrap px-4 py-3">
                            {formatResumeCellValue(row[col])}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-4 py-3">
                          <EmployeeResumeLinkFromRow row={row} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {!isLoading && !isError && filteredRows.length > 0 ? (
            <ListPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              rangeStart={pagination.rangeStart}
              rangeEnd={pagination.rangeEnd}
              pageSize={pagination.pageSize}
              pageSizeOptions={pagination.pageSizeOptions}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          ) : null}

          {!isLoading && !isError && !filteredRows.length ? (
            <div className="rounded-xl border border-dashed border-wt-border bg-wt-surface-2/40 px-6 py-12 text-center">
              <p className="text-sm font-medium text-wt-text">No resumes to show</p>
              <p className="mt-1 text-sm text-wt-text-muted">
                {search.trim()
                  ? "Try a different search term."
                  : "The API returned no resume records."}
              </p>
            </div>
          ) : null}

          {showRawJson && rawPayload !== undefined ? (
            <div className="rounded-xl border border-wt-border bg-wt-surface-2/50 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-wt-text-muted">
                GET /api/v1/employee-resume — response
              </p>
              <pre className="wt-scroll-both max-h-[min(50vh,400px)] overflow-auto text-xs text-wt-text">
                {JSON.stringify(rawPayload, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}
