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

const LIST_COLUMNS: Array<{ key: string; label: string }> = [
  { key: "name", label: "Employee Name" },
  { key: "emp_id", label: "Employee ID" },
  { key: "email", label: "Email" },
  { key: "department", label: "Department" },
  { key: "role", label: "Role" },
  { key: "band", label: "Band" },
  { key: "date_of_joining", label: "Date of Joining" },
  { key: "date_of_birth", label: "Date of Birth" },
  { key: "status", label: "Status" },
  { key: "user_type", label: "User Type" },
  { key: "work_mode", label: "Work Mode" },
  { key: "work_location", label: "Work Location" },
  { key: "phone_number", label: "Phone" },
  { key: "yoe", label: "YOE" },
  { key: "primary_skills", label: "Primary Skills" },
];

export function EmployeeDirectoryPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
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
    return rows
      .map((row) => {
        const record = row as Record<string, unknown>;
        const empId = rowEmpId(record);
        return { record, empId, display: onboardRowToListRow(record) };
      })
      .filter(({ empId, record, display }) => {
        if (!empId) return false;
        if (!needle) return true;
        const haystack = [
          display.name,
          display.emp_id,
          display.email,
          display.department,
          display.role,
          display.band,
          display.status,
          cleanEmployeeName(record),
          rowEmail(record),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
  }, [rows, search]);

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
          <p className="mt-1 text-sm text-wt-text-muted">
            Browse onboarded employees. Click a row to open their profile.
          </p>
          <label className="mt-4 flex max-w-md flex-col gap-1 text-xs text-wt-text-muted">
            Search employees
            <input
              className="input-field px-3 py-2.5 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, department, designation…"
              aria-label="Search employees"
            />
          </label>
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
              <div className="wt-scroll-both max-h-[min(65vh,600px)] overflow-auto rounded-xl border border-wt-border">
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
                    {tableRows.map(({ empId, display, record }) => (
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
                          <td key={col.key} className="whitespace-nowrap px-4 py-3">
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
              <p className="mt-3 text-xs text-wt-text-muted">
                Showing {tableRows.length} employee{tableRows.length === 1 ? "" : "s"}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}
