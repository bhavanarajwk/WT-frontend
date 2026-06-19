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
import { useMemo, useRef, useState } from "react";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
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
import { TableRowsSkeleton } from "@/components/dashboard/ui/SectionSkeleton";
import { BlackLoader } from "@/components/dashboard/shared/BlackLoader";

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
    return <TableRowsSkeleton rows={8} columns={displayColumns.length || 8} />;
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
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-wt-surface-1/70"
            aria-busy="true"
            aria-live="polite"
          >
            <BlackLoader label="Refreshing employees…" />
          </div>
        ) : null}
        <WtTable>
          <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
            <TableRow className="hover:bg-transparent">
              {displayColumns.map((col) => {
                const columnSortOpts = sortOptionsForColumn(col, SORT_OPTIONS);
                const activeDir = columnSortOpts.length
                  ? activeSortDirectionForColumn(col, sortId, SORT_OPTIONS)
                  : null;
                return (
                  <TableHead key={col}>
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
                  </TableHead>
                );
              })}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pageItems.map((row, idx) => {
              const email = invitedEmployeeWorkEmail(row);
              const canResend = canResendOnboardInvite(row.status) && Boolean(email);
              const isResending = Boolean(email && resendingEmail === email);
              const rowKey = String(row.emp_id ?? email ?? idx);

              return (
                <TableRow key={rowKey}>
                  {displayColumns.map((col) => (
                    <TableCell key={col} className="px-3 py-2 whitespace-nowrap">
                      {col === "status" ? (
                        <EmployeeStatusBadge status={String(row[col] ?? "")} />
                      ) : row[col] === null || row[col] === undefined ? (
                        "—"
                      ) : (
                        String(row[col])
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="px-3 py-2 whitespace-nowrap">
                    {canResend ? (
                      <Button variant="brand" size="xs" type="button" className="px-2.5 py-1 text-xs" disabled={actionLoading || isResending} onClick={() => onResendInvite(email)}
                      >
                        {isResending ? (
                          <span className="inline-flex items-center gap-2">
                            <BlackLoader label="Resending Invite" size="sm" />
                            <span>Resending Invite…</span>
                          </span>
                        ) : (
                          "Resend Invite"
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs text-wt-text-muted">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </WtTable>
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
