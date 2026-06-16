"use client";

import { useMemo, useState } from "react";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  activeSortDirectionForColumn,
  applyListSort,
  pickRowField,
  sortOptionsForColumn,
  toggleColumnSort,
  type ListSortOption,
} from "@/utils/listSort";
import {
  canResendOnboardInvite,
  invitedEmployeeWorkEmail,
} from "@/utils/dashboard/invitedEmployees";
import { formatTableColumnHeader, prepareTableForDisplay } from "@/utils/tableDisplay";

const DATA_COLUMNS = [
  "emp_id",
  "name",
  "email",
  "personal_email",
  "status",
  "user_type",
  "department",
  "created_at",
] as const;

const SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "created_at_desc",
    label: "Created",
    columnKeys: ["created_at"],
    direction: "desc",
    type: "date",
    getValue: (row) => pickRowField(row, ["created_at", "createdAt"]),
  },
  {
    id: "created_at_asc",
    label: "Created",
    columnKeys: ["created_at"],
    direction: "asc",
    type: "date",
    getValue: (row) => pickRowField(row, ["created_at", "createdAt"]),
  },
  {
    id: "name_asc",
    label: "Name",
    columnKeys: ["name"],
    direction: "asc",
    getValue: (row) => pickRowField(row, ["name"]),
  },
  {
    id: "name_desc",
    label: "Name",
    columnKeys: ["name"],
    direction: "desc",
    getValue: (row) => pickRowField(row, ["name"]),
  },
  {
    id: "email_asc",
    label: "Email",
    columnKeys: ["email"],
    direction: "asc",
    getValue: (row) => pickRowField(row, ["email"]),
  },
  {
    id: "email_desc",
    label: "Email",
    columnKeys: ["email"],
    direction: "desc",
    getValue: (row) => pickRowField(row, ["email"]),
  },
];

type Props = {
  rows: Array<Record<string, unknown>>;
  emptyLabel: string;
  actionLoading?: boolean;
  resendingEmail?: string | null;
  onResendInvite: (email: string) => void;
};

export function InvitedEmployeesTable({
  rows,
  emptyLabel,
  actionLoading = false,
  resendingEmail = null,
  onResendInvite,
}: Props) {
  const [sortId, setSortId] = useState(SORT_OPTIONS[0]?.id ?? "");

  const { columns: displayColumns, rows: displaySourceRows } = useMemo(
    () => prepareTableForDisplay([...DATA_COLUMNS], rows),
    [rows]
  );

  const sortedRows = useMemo(
    () => applyListSort(displaySourceRows, sortId, SORT_OPTIONS),
    [displaySourceRows, sortId]
  );

  const pagination = useClientPagination(sortedRows, { pageSize: 20, resetKeys: [sortId] });

  if (!displaySourceRows.length) {
    return <p className="text-sm text-wt-text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
        <table className="wt-scrollable-table text-sm">
          <thead className="wt-table-sticky-head text-wt-text-muted">
            <tr>
              {displayColumns.map((col) => {
                const columnSortOpts = sortOptionsForColumn(col, SORT_OPTIONS);
                const activeDir = columnSortOpts.length
                  ? activeSortDirectionForColumn(col, sortId, SORT_OPTIONS)
                  : null;
                return (
                  <th key={col} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                    <TableSortHeader
                      label={formatTableColumnHeader(col)}
                      activeDirection={activeDir}
                      sortable={columnSortOpts.length > 0}
                      onSort={
                        columnSortOpts.length
                          ? () => setSortId(toggleColumnSort(col, sortId, SORT_OPTIONS))
                          : undefined
                      }
                    />
                  </th>
                );
              })}
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((row, idx) => {
              const email = invitedEmployeeWorkEmail(row);
              const canResend = canResendOnboardInvite(row.status) && Boolean(email);
              const isResending = Boolean(email && resendingEmail === email);
              const rowKey = String(row.emp_id ?? email ?? idx);

              return (
                <tr key={rowKey} className="border-t border-wt-border">
                  {displayColumns.map((col) => (
                    <td key={col} className="px-3 py-2 whitespace-nowrap">
                      {row[col] === null || row[col] === undefined ? "—" : String(row[col])}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {canResend ? (
                      <button
                        type="button"
                        className="rounded-lg border border-wt-border bg-wt-surface-1 px-2.5 py-1 text-xs font-medium text-wt-text hover:bg-wt-surface-2 disabled:opacity-50"
                        disabled={actionLoading || isResending}
                        onClick={() => onResendInvite(email)}
                      >
                        {isResending ? "Sending…" : "Resend invite"}
                      </button>
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
      {pagination.totalPages > 1 ? (
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
    </div>
  );
}
