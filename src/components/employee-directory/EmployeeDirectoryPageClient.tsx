"use client";

import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import Link from "next/link";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useMemo, useState, useCallback } from "react";
import { DASHBOARD_ROUTES, employeeDirectoryProfilePath } from "@/constants/routes";
import { useEmployeeDirectoryAccess } from "@/hooks/employee-directory/useEmployeeDirectoryAccess";
import { useEmployeeDirectoryList } from "@/hooks/employee-directory/useEmployeeDirectoryList";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { ManagementListCard, ManagementListContent } from "@/components/dashboard/ui/ManagementListCard";
import { SearchInput } from "@/components/dashboard/ui/SearchInput";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cleanEmployeeName,
  onboardRowToListRow,
  rowEmpId,
} from "@/utils/employeeDirectory";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  activeSortDirectionForColumn,
  applyListSort,
  EMPLOYEE_DIRECTORY_SORT_OPTIONS,
  sortOptionsForColumn,
  toggleColumnSort,
} from "@/utils/listSort";

const USER_TYPE_FILTER_OPTIONS = [
  { value: "FULLTIME", label: "Full Time" },
  { value: "INTERN", label: "Intern" },
  { value: "CONSULTANT", label: "Consultant" },
] as const;

const USER_TYPE_SELECT_OPTIONS = [
  { value: "", label: "All user types" },
  ...USER_TYPE_FILTER_OPTIONS,
];

type UserTypeFilterValue = (typeof USER_TYPE_FILTER_OPTIONS)[number]["value"] | "";

const EMPLOYEE_DIRECTORY_PAGE_SIZE = 10;

const LIST_COLUMNS: Array<{ key: string; label: string }> = [
  { key: "name", label: "Employee Name" },
  { key: "email", label: "Email" },
  { key: "phone_number", label: "Phone" },
  { key: "role", label: "Designation" },
  { key: "band", label: "Band" },
  { key: "user_type", label: "User Type" },
  { key: "work_mode", label: "Work Mode" },
  { key: "date_of_joining", label: "Date of Joining" },
  { key: "status", label: "Status" },
];

function normalizeUserType(value: unknown): UserTypeFilterValue | string {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "");
  if (normalized === "FULLTIME") return "FULLTIME";
  if (normalized === "INTERN") return "INTERN";
  if (normalized === "CONSULTANT") return "CONSULTANT";
  return normalized;
}

function hasCopyableValue(value: string | undefined): boolean {
  const text = String(value ?? "").trim();
  return Boolean(text) && text !== "—";
}

function CopyIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CopyValueButton({
  value,
  label,
  onCopy,
}: {
  value: string;
  label: string;
  onCopy: (value: string, successMessage: string) => void;
}) {
  if (!hasCopyableValue(value)) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="inline-flex shrink-0 rounded p-1 text-wt-text-muted hover:bg-wt-surface-2 hover:text-wt-text"
      aria-label={`Copy ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        onCopy(value, `${label} Copied Successfully`);
      }}
    >
      <CopyIcon />
    </Button>
  );
}

export function EmployeeDirectoryPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilterValue>("");
  const [sortId, setSortId] = useState("doj_desc");
  const { authStatus, canView: canViewDirectory, queriesEnabled } =
    useEmployeeDirectoryAccess();
  const { data: rows = [], isLoading, isError, error, refetch } = useEmployeeDirectoryList({
    enabled: queriesEnabled,
  });

  const tableRows = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    const filtered = rows
      .map((row) => {
        const record = row as unknown as Record<string, unknown>;
        const empId = rowEmpId(record);
        return { record, empId, display: onboardRowToListRow(row) };
      })
      .filter(({ empId, record, display }) => {
        if (!empId) return false;
        if (userTypeFilter && normalizeUserType(display.user_type) !== userTypeFilter) {
          return false;
        }
        if (!needle) return true;
        const haystack = [
          display.name,
          display.email,
          display.phone_number,
          display.role,
          display.band,
          display.user_type,
          display.work_mode,
          display.status,
          cleanEmployeeName(record),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
    return applyListSort(filtered, sortId, EMPLOYEE_DIRECTORY_SORT_OPTIONS);
  }, [rows, debouncedSearch, userTypeFilter, sortId]);

  const pagination = useClientPagination(tableRows, {
    pageSize: EMPLOYEE_DIRECTORY_PAGE_SIZE,
    resetKeys: [debouncedSearch, userTypeFilter, sortId],
  });

  const handleCopyField = useCallback(
    async (value: string, successMessage: string) => {
      const text = value.trim();
      if (!hasCopyableValue(text)) return;
      try {
        await navigator.clipboard.writeText(text);
        showSuccessToast(successMessage);
      } catch {
        showErrorToast("Could not copy to clipboard.");
      }
    },
    []
  );

  if (authStatus !== "loading" && !canViewDirectory) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 shadow-sm">
          <h3 className="text-lg font-semibold">Access Restricted</h3>
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
    <DashboardPageShell className="wt-detail-page">
      <ManagementListCard
        title="All Employees"
        description="Browse and manage employee profiles across the organization."
        search={
          <SearchInput
            id="employee-directory-search"
            value={search}
            onChange={setSearch}
            placeholder="Search"
            aria-label="Search employees"
          />
        }
        filters={
          <div className="w-44 shrink-0">
            <label className="sr-only" htmlFor="employee-directory-user-type">
              User Type
            </label>
            <Select
              value={userTypeFilter}
              onValueChange={(next) => setUserTypeFilter((next ?? "ALL") as UserTypeFilterValue)}
              items={USER_TYPE_SELECT_OPTIONS}
            >
              <SelectTrigger id="employee-directory-user-type" aria-label="User Type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_TYPE_SELECT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
            <p>Could not load employees.{error instanceof Error ? ` ${error.message}` : ""}</p>
            <Button variant="ghost" size="xs" type="button" className="mt-3 px-3 py-1.5 text-xs" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        <ManagementListContent
          isLoading={isLoading}
          isEmpty={!isError && !tableRows.length}
          emptyTitle="No employees to show"
          emptyDescription={
            debouncedSearch.trim() || userTypeFilter
              ? "Try adjusting your search or filters."
              : "No employees were returned from the API."
          }
          skeletonRows={8}
          skeletonColumns={LIST_COLUMNS.length}
        >
          <>
            <div className="wt-detail-scroll-section min-h-0">
              <ScrollableTable scrollChain maxHeightClass="max-h-[min(58vh,560px)]">
                <WtTable>
                  <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                    <TableRow className="hover:bg-transparent">
                      {LIST_COLUMNS.map((col) => {
                        const columnSortOpts = sortOptionsForColumn(
                          col.key,
                          EMPLOYEE_DIRECTORY_SORT_OPTIONS
                        );
                        const activeDir = columnSortOpts.length
                          ? activeSortDirectionForColumn(
                              col.key,
                              sortId,
                              EMPLOYEE_DIRECTORY_SORT_OPTIONS
                            )
                          : null;
                        return (
                          <TableHead key={col.key}>
                            <TableSortHeader
                              label={col.label}
                              activeDirection={activeDir}
                              sortable={columnSortOpts.length > 0}
                              onSort={
                                columnSortOpts.length
                                  ? () =>
                                      setSortId(
                                        toggleColumnSort(
                                          col.key,
                                          sortId,
                                          EMPLOYEE_DIRECTORY_SORT_OPTIONS
                                        )
                                      )
                                  : undefined
                              }
                            />
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.pageItems.map(({ empId, display }) => {
                      return (
                        <TableRow
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
                            <TableCell
                              key={col.key}
                              className="max-w-[14rem] px-3 py-2"
                              title={
                                col.key === "status"
                                  ? undefined
                                  : String(display[col.key] ?? "—")
                              }
                            >
                              {col.key === "status" ? (
                                <EmployeeStatusBadge status={display.status} />
                              ) : col.key === "name" ? (
                                <span className="block truncate font-medium text-blue-600">{display[col.key]}</span>
                              ) : col.key === "email" ? (
                                <div className="flex w-full min-w-0 items-center gap-1.5">
                                  <span className="block min-w-0 flex-1 truncate text-wt-text">{display.email}</span>
                                  <CopyValueButton
                                    value={display.email}
                                    label="Email"
                                    onCopy={(value, message) => void handleCopyField(value, message)}
                                  />
                                </div>
                              ) : col.key === "phone_number" ? (
                                <div className="flex w-full min-w-0 items-center gap-1.5">
                                  <span className="block min-w-0 flex-1 truncate text-wt-text">{display.phone_number}</span>
                                  <CopyValueButton
                                    value={display.phone_number}
                                    label="Phone Number"
                                    onCopy={(value, message) => void handleCopyField(value, message)}
                                  />
                                </div>
                              ) : (
                                <span className="block truncate text-wt-text">{display[col.key] ?? "—"}</span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </WtTable>
              </ScrollableTable>
            </div>
              <ListPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
              />
          </>
        </ManagementListContent>
      </ManagementListCard>
    </DashboardPageShell>
  );
}
