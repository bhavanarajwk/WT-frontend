"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DASHBOARD_ROUTES, employeeDirectoryProfilePath } from "@/constants/routes";
import { useEmployeeDirectoryAccess } from "@/hooks/employee-directory/useEmployeeDirectoryAccess";
import { useEmployeeDirectoryList } from "@/hooks/employee-directory/useEmployeeDirectoryList";
import { useEmployeeResumes } from "@/hooks/resumes/useEmployeeResumes";
import { EmployeeResumeLink } from "@/components/resumes/EmployeeResumeLink";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { buildResumeShareLinkIndex, lookupResumeShareLink } from "@/utils/employeeResume";
import { canFetchEmployeeResumeApi } from "@/utils/roles";
import {
  cleanEmployeeName,
  onboardRowToListRow,
  rowEmail,
  rowEmpId,
} from "@/utils/employeeDirectory";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
import { ListSortSelect, sortOptionMeta } from "@/components/dashboard/ui/ListSortSelect";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  applyListSort,
  EMPLOYEE_DIRECTORY_SORT_OPTIONS,
} from "@/utils/listSort";

const LIST_COLUMNS: Array<{ key: string; label: string }> = [
  { key: "name", label: "Employee Name" },
  { key: "email", label: "Email" },
  { key: "department", label: "Department" },
  { key: "role", label: "Role" },
  { key: "band", label: "Band" },
  { key: "date_of_joining", label: "Date of Joining" },
  { key: "date_of_birth", label: "Date of Birth" },
  { key: "status", label: "Status" },
  { key: "user_type", label: "User Type" },
  { key: "work_mode", label: "Work Mode" },
  { key: "phone_number", label: "Phone" },
  { key: "primary_skills", label: "Primary Skills" },
];

export function EmployeeDirectoryPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("doj_desc");
  const { authStatus, canView: canViewDirectory, queriesEnabled, roles } =
    useEmployeeDirectoryAccess();
  const { data: rows = [], isLoading, isError, error, refetch } = useEmployeeDirectoryList({
    enabled: queriesEnabled,
  });
  const { data: resumePayload } = useEmployeeResumes({
    enabled: queriesEnabled && canFetchEmployeeResumeApi(roles),
  });

  const resumeLinkIndex = useMemo(
    () => buildResumeShareLinkIndex(resumePayload?.rows ?? []),
    [resumePayload]
  );

  const tableRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = rows
      .map((row) => {
        const record = row as unknown as Record<string, unknown>;
        const empId = rowEmpId(record);
        return { record, empId, display: onboardRowToListRow(row) };
      })
      .filter(({ empId, record, display }) => {
        if (!empId) return false;
        if (!needle) return true;
        const haystack = [display.name, cleanEmployeeName(record)].join(" ").toLowerCase();
        return haystack.includes(needle);
      });
    return applyListSort(filtered, sortId, EMPLOYEE_DIRECTORY_SORT_OPTIONS);
  }, [rows, search, sortId]);

  const pagination = useClientPagination(tableRows, {
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

  if (!canViewDirectory) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 shadow-sm">
          <h3 className="text-lg font-semibold">Access restricted</h3>
          <p className="mt-2 text-sm text-wt-text-muted">
            Employee Directory is available to HR and admin users only.
          </p>
          <Link href={DASHBOARD_ROUTES.overview} className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Back to overview
          </Link>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="border-b border-wt-border px-5 py-5 md:px-7 md:py-6">
          <h3 className="text-lg font-semibold">All employees</h3>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-1 text-xs text-wt-text-muted">
              Search employees
              <input
                className="input-field px-3 py-2.5 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name"
                aria-label="Search name"
              />
            </label>
            <ListSortSelect
              value={sortId}
              onChange={setSortId}
              options={sortOptionMeta(EMPLOYEE_DIRECTORY_SORT_OPTIONS)}
            />
          </div>
        </div>

        <div className="p-5 md:p-7">
          {isLoading ? (
            <p className="text-sm text-wt-text-muted">Loading employees…</p>
          ) : null}

          {isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p>Could not load employees.{error instanceof Error ? ` ${error.message}` : ""}</p>
              <button type="button" className="btn-ghost mt-3 px-3 py-1.5 text-xs" onClick={() => void refetch()}>
                Retry
              </button>
            </div>
          ) : null}

          {!isLoading && !isError && !tableRows.length ? (
            <div className="rounded-xl border border-dashed border-wt-border bg-wt-surface-2/40 px-6 py-12 text-center">
              <p className="text-sm font-medium text-wt-text">No employees to show</p>
              <p className="mt-1 text-sm text-wt-text-muted">
                {search.trim() ? "Try a different search term." : "No employees were returned from the API."}
              </p>
            </div>
          ) : null}

          {!isLoading && !isError && tableRows.length ? (
            <>
              <div className="wt-scroll-both overflow-auto rounded-xl border border-wt-border">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-[1] bg-wt-surface-2 text-wt-text-muted">
                    <tr>
                      {LIST_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        >
                          {col.label}
                        </th>
                      ))}
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Resume
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wt-border">
                    {pagination.pageItems.map(({ empId, display, record }) => (
                      <tr
                        key={empId}
                        className="cursor-pointer transition hover:bg-blue-50/50 dark:hover:bg-wt-surface-2"
                        onClick={() => router.push(employeeDirectoryProfilePath(empId))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(employeeDirectoryProfilePath(empId));
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`View profile for ${display.name}`}
                      >
                        {LIST_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-3 ${
                              col.key === "primary_skills"
                                ? "max-w-[14rem] whitespace-normal text-xs"
                                : "whitespace-nowrap"
                            }`}
                          >
                            {col.key === "status" ? (
                              <EmployeeStatusBadge status={display.status} />
                            ) : col.key === "name" ? (
                              <span className="font-medium text-blue-600">{display[col.key]}</span>
                            ) : (
                              display[col.key] ?? "—"
                            )}
                          </td>
                        ))}
                        <td
                          className="whitespace-nowrap px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <EmployeeResumeLink
                            href={lookupResumeShareLink(resumeLinkIndex, {
                              empId,
                              userId: String(record.user_id ?? record.userId ?? "").trim(),
                              email: rowEmail(record),
                            })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ListPagination
                className="mt-3"
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
            </>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}
