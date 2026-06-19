"use client";

import { useMemo, useRef, useState } from "react";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";
import { DEFAULT_PAGE_SIZE, useClientPagination } from "@/hooks/useClientPagination";
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
import { BlackLoader } from "@/components/dashboard/shared/BlackLoader";
import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";

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
  loading?: boolean;
  actionLoading?: boolean;
  resendingEmail?: string | null;
  onResendInvite: (email: string) => void;
};

export function InvitedEmployeesTable({
  rows,
  emptyLabel,
  loading = false,
  actionLoading = false,
  resendingEmail = null,
  onResendInvite,
}: Props) {
  const [sortId, setSortId] = useState(SORT_OPTIONS[0]?.id ?? "");
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const { columns: displayColumns, rows: displaySourceRows } = useMemo(
    () => prepareTableForDisplay([...DATA_COLUMNS], rows),
    [rows]
  );

  const sortedRows = useMemo(
    () => applyListSort(displaySourceRows, sortId, SORT_OPTIONS),
    [displaySourceRows, sortId]
  );

  const pagination = useClientPagination(sortedRows, {
    pageSize: DEFAULT_PAGE_SIZE,
    resetKeys: [sortId],
  });

  if (loading && !displaySourceRows.length) {
    return (
      <div
        className="flex min-h-[min(70vh,520px)] items-center justify-center rounded-xl border border-wt-border bg-wt-surface-1"
        aria-busy="true"
        aria-live="polite"
      >
        <SectionLoading label="Loading Employees…" />
      </div>
    );
  }

  if (!loading && !displaySourceRows.length) {
    return <p className="text-sm text-wt-text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      <div
        className="relative wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border"
        style={{ overscrollBehaviorY: "auto" }}
        ref={tableScrollRef}
        onWheel={(event) => {
          const el = tableScrollRef.current;
          if (!el) return;
          if (el.scrollHeight <= el.clientHeight) return;
          const deltaY = event.deltaY;
          const scrollingDown = deltaY > 0;
          const atTop = el.scrollTop <= 0;
          const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
          const blockedAtBoundary = (scrollingDown && atBottom) || (!scrollingDown && atTop);
          if (!blockedAtBoundary) return;

          const pageScroller = el.closest(".wt-page-scroll") as HTMLElement | null;
          if (!pageScroller) return;
          event.preventDefault();
          pageScroller.scrollBy({ top: deltaY, behavior: "auto" });
        }}
      >
        {loading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-wt-surface-1/85"
            aria-busy="true"
            aria-live="polite"
          >
            <SectionLoading label="Loading Employees…" />
          </div>
        ) : null}
        <table className="wt-scrollable-table text-sm">
          <thead className="wt-table-sticky-head text-wt-text-muted">
            <tr>
              {displayColumns.map((col) => {
                const columnSortOpts = sortOptionsForColumn(col, SORT_OPTIONS);
                const activeDir = columnSortOpts.length
                  ? activeSortDirectionForColumn(col, sortId, SORT_OPTIONS)
                  : null;
                return (
                  <th
                    key={col}
                    className="sticky top-0 z-10 bg-wt-surface-2 text-left px-3 py-2 font-medium whitespace-nowrap"
                  >
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
              <th className="sticky top-0 z-10 bg-wt-surface-2 text-left px-3 py-2 font-medium whitespace-nowrap">
                Actions
              </th>
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
                        className="btn-action px-2.5 py-1 text-xs"
                        disabled={actionLoading || isResending}
                        onClick={() => onResendInvite(email)}
                      >
                        {isResending ? (
                          <span className="inline-flex items-center gap-2">
                            <BlackLoader label="Resending Invite" size="sm" />
                            <span>Resending Invite…</span>
                          </span>
                        ) : (
                          "Resend Invite"
                        )}
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
      <ListPagination
        className="mt-2"
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
      />
    </div>
  );
}
