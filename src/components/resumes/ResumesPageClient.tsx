"use client";

import { Button } from "@/components/ui/button";
import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { TableRowsSkeleton } from "@/components/dashboard/ui/SectionSkeleton";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { Input } from "@/components/ui/input";
import { useEmployeeResumes } from "@/hooks/resumes/useEmployeeResumes";
import { canViewEmployeeResumes } from "@/utils/roles";
import {
  formatResumeCellValue,
  resumeRowEmpId,
  tableColumnsForResumeRows,
} from "@/utils/employeeResume";
import { EmployeeResumeLinkFromRow } from "@/components/resumes/EmployeeResumeLink";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  activeSortDirectionForColumn,
  applyListSort,
  resumeSortOptions,
  sortOptionsForColumn,
  toggleColumnSort,
} from "@/utils/listSort";
import { formatTableColumnHeader } from "@/utils/tableDisplay";

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

  if (authStatus !== "loading" && !canView) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 shadow-sm">
          <h3 className="text-lg font-semibold">Access Restricted</h3>
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
            <label className="sr-only" htmlFor="resumes-search">
              Search
            </label>
            <Input
              id="resumes-search"
              type="search"
              className="h-10 min-w-[min(100%,280px)] flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              aria-label="Search"
            />
          </div>
        </div>

        <div className="space-y-4 p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="brand" size="sm" type="button" className="px-3 py-2 text-sm" disabled={isLoading} onClick={() => void refetch()}
            >
              Refresh
            </Button>
            <Button variant="ghost" size="sm" type="button" className="px-3 py-2 text-sm" onClick={() => setShowRawJson((v) => !v)}
            >
              {showRawJson ? "Hide" : "Show"} API response
            </Button>
          </div>

          {isLoading ? <TableRowsSkeleton rows={6} columns={5} /> : null}

          {isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p>Could not load resumes.{error instanceof Error ? ` ${error.message}` : ""}</p>
              <Button variant="ghost" size="xs" type="button" className="mt-3 px-3 py-1.5 text-xs" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : null}

          {!isLoading && !isError && filteredRows.length > 0 ? (
            <ScrollableTable maxHeightClass="max-h-[min(65vh,560px)]">
              <WtTable>
                <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                  <TableRow className="hover:bg-transparent">
                    {columns.map((col) => {
                      const columnSortOpts = sortOptions.length
                        ? sortOptionsForColumn(col, sortOptions)
                        : [];
                      const activeDir = columnSortOpts.length
                        ? activeSortDirectionForColumn(col, sortId, sortOptions)
                        : null;
                      return (
                        <TableHead
                          key={col}
                        >
                          <TableSortHeader
                            label={formatTableColumnHeader(col)}
                            activeDirection={activeDir}
                            sortable={columnSortOpts.length > 0}
                            onSort={
                              columnSortOpts.length
                                ? () => setSortId(toggleColumnSort(col, sortId, sortOptions))
                                : undefined
                            }
                          />
                        </TableHead>
                      );
                    })}
                    <TableHead>Resume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.map((row, idx) => {
                    const empId = resumeRowEmpId(row);
                    return (
                      <TableRow key={empId || `resume-row-${idx}`}>
                        {columns.map((col) => (
                          <TableCell key={col} className="whitespace-nowrap px-4 py-3">
                            {formatResumeCellValue(row[col])}
                          </TableCell>
                        ))}
                        <TableCell className="whitespace-nowrap px-4 py-3">
                          <EmployeeResumeLinkFromRow row={row} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </WtTable>
            </ScrollableTable>
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
