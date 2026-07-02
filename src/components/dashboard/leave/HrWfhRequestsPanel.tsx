"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { UI_COPY } from "@/constants/uiCopy";
import { FormSection } from "@/components/dashboard/ui/FormSection";
import { ApiDateField, InputField, SelectField } from "@/components/dashboard/ui/forms";
import { LeaveRequestStatusBadge } from "@/components/dashboard/leave/LeaveRequestStatusBadge";
import { LeaveManagerEmailsCell } from "@/components/dashboard/leave/LeaveManagerEmailsCell";
import { useHrWfhRequests } from "@/hooks/leave/useHrWfhRequests";
import { useClientPagination } from "@/hooks/useClientPagination";
import { formatUserRequestTypeLabel } from "@/utils/actionToast";
import { formatLeaveDateRange, formatLeaveDaysCount } from "@/utils/leaveRequestDisplay";
import { pickManagerEmailList } from "@/utils/leaveManagerDisplay";
import { requestFinalStatus } from "@/utils/userRequest";
import {
  activeSortDirectionForColumn,
  applyListSort,
  LEAVE_REQUEST_SORT_OPTIONS,
  toggleColumnSort,
} from "@/utils/listSort";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";

const TABLE_COL_COUNT = 6;
const TABLE_MIN_HEIGHT = "min-h-[280px]";

function wfhRequestMatchesSearch(row: Record<string, unknown>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.employee_display,
    row.name,
    row.employee_name,
    row.email,
    row.user_email,
    row.request_from_date,
    row.requestFromDate,
    row.request_to_date,
    row.requestToDate,
    row.status,
    row.manager_status,
    row.managerStatus,
    row.comments,
    formatUserRequestTypeLabel(row.request_type ?? row.requestType),
  ]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  return haystack.includes(q);
}

export function HrWfhRequestsPanel({
  actionLoading,
  runAction,
}: {
  actionLoading: boolean;
  runAction: (label: string, fn: () => Promise<unknown>) => Promise<void>;
}) {
  const { rows, loading, filters, setFilters, load } = useHrWfhRequests();
  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState(LEAVE_REQUEST_SORT_OPTIONS[0].id);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(
    () => rows.filter((row) => wfhRequestMatchesSearch(row, search)),
    [rows, search]
  );

  const sortedRows = useMemo(
    () => applyListSort(filteredRows, sortId, LEAVE_REQUEST_SORT_OPTIONS),
    [filteredRows, sortId]
  );

  const pagination = useClientPagination(sortedRows, {
    resetKeys: [sortId, search, filters.fromDate, filters.toDate],
  });

  return (
    <div className="space-y-4">
      <div className="flex w-full flex-wrap items-end gap-3">
        <div className="min-w-0 flex-[2]">
          <InputField
            label="Search"
            type="search"
            value={search}
            onChange={setSearch}
            placeholder="Search by employee, date, status…"
          />
        </div>
        <ApiDateField
          label="From Date"
          value={filters.fromDate}
          onChange={(v) => setFilters((prev) => ({ ...prev, fromDate: v }))}
          className="min-w-0 flex-1"
        />
        <ApiDateField
          label="To Date"
          value={filters.toDate}
          onChange={(v) => setFilters((prev) => ({ ...prev, toDate: v }))}
          className="min-w-0 flex-1"
        />
        <SelectField
          label="Sort By"
          value={sortId}
          options={LEAVE_REQUEST_SORT_OPTIONS.map((opt) => ({
            value: opt.id,
            label: `${opt.label} (${opt.direction === "desc" ? "Newest" : "Oldest"})`,
          }))}
          onChange={setSortId}
          className="min-w-0 flex-1"
        />
        <Button
          variant="brand"
          type="button"
          className="h-10 shrink-0 px-3 py-2"
          onClick={() => runAction("Refresh WFH requests", () => load())}
          disabled={actionLoading || loading}
        >
          Fetch Requests
        </Button>
      </div>

      <FormSection title="WFH Requests" className="rounded-2xl shadow-sm">
        <ScrollableTable maxHeightClass="max-h-[min(70vh,520px)]" className={TABLE_MIN_HEIGHT}>
          <WtTable>
            <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead>
                  <TableSortHeader
                    label="Employee"
                    activeDirection={activeSortDirectionForColumn(
                      "employee",
                      sortId,
                      LEAVE_REQUEST_SORT_OPTIONS
                    )}
                    sortable
                    onSort={() =>
                      setSortId(toggleColumnSort("employee", sortId, LEAVE_REQUEST_SORT_OPTIONS))
                    }
                  />
                </TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approver(s)</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <TableRow key={`hr-wfh-skeleton-${rowIndex}`}>
                    {Array.from({ length: TABLE_COL_COUNT }).map((_, colIndex) => (
                      <TableCell key={colIndex} className="px-3 py-2.5">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pagination.pageItems.length ? (
                pagination.pageItems.map((row, idx) => {
                  const rowRecord = row as Record<string, unknown>;
                  const requestId = String(
                    rowRecord.user_request_id ??
                      rowRecord.userRequestId ??
                      rowRecord.request_id ??
                      rowRecord.requestId ??
                      rowRecord.id ??
                      ""
                  ).trim();
                  const finalStatus = requestFinalStatus(rowRecord);
                  const primaryManagers = pickManagerEmailList(rowRecord, "primary");
                  const fromDate = String(
                    rowRecord.request_from_date ?? rowRecord.requestFromDate ?? ""
                  );
                  const toDate = String(rowRecord.request_to_date ?? rowRecord.requestToDate ?? "");
                  const isHalfDay = Boolean(rowRecord.is_half_day ?? rowRecord.isHalfDay ?? false);
                  const employee = String(rowRecord.employee_display ?? "—").trim();

                  return (
                    <TableRow key={`${requestId || "wfh"}-${idx}`}>
                      <TableCell className="px-3 py-2.5 whitespace-nowrap">{employee}</TableCell>
                      <TableCell className="px-3 py-2.5 whitespace-nowrap">
                        {formatLeaveDateRange(fromDate, toDate, isHalfDay)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 whitespace-nowrap">
                        <LeaveRequestStatusBadge status={finalStatus} />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 whitespace-nowrap">
                        <LeaveManagerEmailsCell emails={primaryManagers} />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                        {formatLeaveDaysCount(fromDate, toDate, isHalfDay)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate px-3 py-2.5">
                        {String(rowRecord.comments ?? "—")}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={TABLE_COL_COUNT}
                    className="px-3 py-10 text-center text-sm text-wt-text-muted"
                  >
                    {rows.length ? UI_COPY.noSearchResults : UI_COPY.noRecordsFound}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </WtTable>
        </ScrollableTable>

        {pagination.totalItems > 0 ? (
          <ListPagination
            className="mt-4"
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
      </FormSection>
    </div>
  );
}
