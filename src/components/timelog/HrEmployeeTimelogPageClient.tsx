"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { useEmployeeDirectoryList } from "@/hooks/employee-directory/useEmployeeDirectoryList";
import { hrmsService } from "@/services/hrms.service";
import { InputField, SelectField } from "@/components/dashboard/ui/forms";
import { ListSortSelect, sortOptionMeta } from "@/components/dashboard/ui/ListSortSelect";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { applyListSort, TIMELOG_SORT_OPTIONS } from "@/utils/listSort";
import { useClientPagination } from "@/hooks/useClientPagination";
import { toPagedRows } from "@/utils/apiRows";
import { cleanEmployeeName, rowEmail } from "@/utils/employeeDirectory";
import { formatResumeCellValue } from "@/utils/employeeResume";
import { prepareTableForDisplay, sanitizeTableColumns } from "@/utils/tableDisplay";
import { todayApiDate } from "@/utils/apiDate";

const LOG_COLUMNS = sanitizeTableColumns([
  "employee_name",
  "employee_email",
  "email",
  "project_code",
  "log_date",
  "hours",
  "description",
  "status",
]);

export function HrEmployeeTimelogPageClient() {
  const { user, status: authStatus } = useAuth();
  const { toast, actionLoading, runAction } = useDashboardAction();
  const [logDate, setLogDate] = useState(() => todayApiDate());
  const [emailFilter, setEmailFilter] = useState("ALL");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [sortId, setSortId] = useState(TIMELOG_SORT_OPTIONS[0].id);

  const roles = user?.roles ?? [];
  const canView = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");
  const queriesEnabled = authStatus === "authenticated" && canView;

  const { data: onboardRows = [] } = useEmployeeDirectoryList({ enabled: queriesEnabled });

  const employeeOptions = useMemo(() => {
    const options: Array<{ email: string; label: string }> = [];
    for (const row of onboardRows) {
      const record = row as unknown as Record<string, unknown>;
      const email = rowEmail(record);
      if (!email) continue;
      const name = cleanEmployeeName(record);
      options.push({ email, label: name ? `${name} (${email})` : email });
    }
    options.sort((a, b) => a.label.localeCompare(b.label));
    return options;
  }, [onboardRows]);

  const tableColumns = useMemo(() => {
    const keys = new Set<string>(LOG_COLUMNS);
    for (const row of rows) {
      Object.keys(row).forEach((k) => keys.add(k));
    }
    return sanitizeTableColumns([...keys]);
  }, [rows]);

  const tableDisplay = useMemo(
    () => prepareTableForDisplay(tableColumns, rows),
    [tableColumns, rows]
  );

  const sortedRows = useMemo(
    () => applyListSort(tableDisplay.rows, sortId, TIMELOG_SORT_OPTIONS),
    [tableDisplay.rows, sortId]
  );

  const pagination = useClientPagination(sortedRows, {
    resetKeys: [sortId, logDate, emailFilter],
  });

  const loadTimelogs = async () => {
    const date = logDate.trim();
    if (!date) throw new Error("Log date is required.");

    const emails =
      emailFilter === "ALL"
        ? employeeOptions.map((o) => o.email)
        : [emailFilter].filter(Boolean);

    if (!emails.length) throw new Error("No employee emails available to query.");

    const responses = await Promise.allSettled(
      emails.map((email) => hrmsService.getTimelogByEmployeeAndDate(email, date))
    );

    const collected: Array<Record<string, unknown>> = [];
    for (let i = 0; i < responses.length; i++) {
      const result = responses[i];
      const email = emails[i];
      if (result.status !== "fulfilled") continue;
      const pageRows = toPagedRows((result.value as { data?: unknown }).data ?? result.value);
      for (const row of pageRows) {
        collected.push({
          ...row,
          employee_email: row.employee_email ?? row.email ?? email,
          log_date: row.log_date ?? row.logDate ?? date,
        });
      }
    }

    setRows(collected);
  };

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
            Employee timelog lookup is available to HR and admin only.
          </p>
          <Link href={DASHBOARD_ROUTES.timelog} className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Back to timelog
          </Link>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <DashboardToast toast={toast} />

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="border-b border-wt-border bg-gradient-to-r from-sky-50/80 via-white to-blue-50/50 px-5 py-6 md:px-7">
          <h3 className="text-lg font-semibold">All employee timelogs</h3>
          <p className="mt-1 max-w-2xl text-sm text-wt-text-muted">
            View timelog entries for any employee on a given date (
            <code className="text-xs">GET /api/v1/timelog/get/&#123;email&#125;/&#123;date&#125;</code>).
          </p>
        </div>

        <div className="space-y-4 p-5 md:p-7">
          <div className="flex flex-wrap items-end gap-3">
            <InputField
              label="Log date"
              type="date"
              required
              value={logDate}
              onChange={setLogDate}
            />
            <SelectField
              label="Employee"
              className="flex min-w-[min(100%,280px)] flex-1"
              value={emailFilter}
              onChange={setEmailFilter}
              placeholder="Search employees…"
              options={[
                { value: "ALL", label: `All employees (${employeeOptions.length})` },
                ...employeeOptions.map((opt) => ({ value: opt.email, label: opt.label })),
              ]}
            />
            <ListSortSelect
              value={sortId}
              onChange={setSortId}
              options={sortOptionMeta(TIMELOG_SORT_OPTIONS)}
              disabled={!rows.length}
            />
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              disabled={actionLoading}
              onClick={() => void runAction("Load employee timelogs", loadTimelogs)}
            >
              Load timelogs
            </button>
          </div>

          {sortedRows.length > 0 ? (
            <>
              <p className="text-sm text-wt-text-muted">
                {pagination.totalItems} entr{pagination.totalItems === 1 ? "y" : "ies"} for{" "}
                <strong>{logDate}</strong>
                {emailFilter !== "ALL" ? ` — ${emailFilter}` : ""}.
              </p>
              <div className="wt-scroll-both max-h-[min(65vh,560px)] overflow-auto rounded-xl border border-wt-border">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-[1] bg-wt-surface-2 text-wt-text-muted">
                    <tr>
                      {tableDisplay.columns.map((col) => (
                        <th
                          key={col}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase"
                        >
                          {col.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wt-border">
                    {pagination.pageItems.map((row, idx) => (
                      <tr key={idx}>
                        {tableDisplay.columns.map((col) => (
                          <td key={col} className="whitespace-nowrap px-4 py-3">
                            {formatResumeCellValue(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-wt-border bg-wt-surface-2/40 px-6 py-10 text-center text-sm text-wt-text-muted">
              Select a date and click <strong>Load timelogs</strong> to fetch entries.
            </p>
          )}
        </div>
      </div>
    </DashboardPageShell>
  );
}
