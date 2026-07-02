"use client";

import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCheckbox,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { useEffect, useMemo, useRef, useState } from "react";
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
  invitedEmployeeWorkEmail,
  isResendableInvitedEmployeeRow,
  mergeEmailSelection,
} from "@/utils/dashboard/invitedEmployees";
import {
  formatTableCellValue,
  formatTableColumnHeader,
  prepareTableForDisplay,
  resolveEmployeeNameFromRow,
} from "@/utils/tableDisplay";

const DATA_COLUMNS = [
  "emp_id",
  "name",
  "email",
  "personal_email",
  "user_type",
  "department",
] as const;

const SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
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
  searchResetKey?: string;
  resendingEmail?: string | null;
  bulkResending?: boolean;
  onResendInvite: (email: string) => void;
  onBulkResendInvite: (emails: string[]) => void | Promise<void>;
};

export function InvitedEmployeesTable({
  rows,
  searchResetKey = "",
  resendingEmail = null,
  bulkResending = false,
  onResendInvite,
  onBulkResendInvite,
}: Props) {
  const [sortId, setSortId] = useState(SORT_OPTIONS[0]?.id ?? "");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
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
    resetKeys: [sortId, searchResetKey],
  });

  useEffect(() => {
    setSelectedEmails([]);
  }, [searchResetKey]);

  const resendableEmailsOnPage = useMemo(
    () =>
      pagination.pageItems
        .filter(isResendableInvitedEmployeeRow)
        .map((row) => invitedEmployeeWorkEmail(row)),
    [pagination.pageItems]
  );

  const selectedResendableCount = selectedEmails.length;
  const allResendableOnPageSelected =
    resendableEmailsOnPage.length > 0 &&
    resendableEmailsOnPage.every((email) => selectedEmails.includes(email));
  const someResendableOnPageSelected =
    resendableEmailsOnPage.some((email) => selectedEmails.includes(email)) &&
    !allResendableOnPageSelected;

  const selectionBusy = bulkResending || Boolean(resendingEmail);

  function toggleRowSelection(email: string, checked: boolean) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setSelectedEmails((prev) => {
      if (checked) {
        return mergeEmailSelection(prev, [normalized]);
      }
      return prev.filter((value) => value !== normalized);
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!checked) {
      setSelectedEmails((prev) =>
        prev.filter((email) => !resendableEmailsOnPage.includes(email))
      );
      return;
    }
    setSelectedEmails((prev) => mergeEmailSelection(prev, resendableEmailsOnPage));
  }

  async function handleBulkResend() {
    if (!selectedEmails.length || bulkResending) return;
    await onBulkResendInvite(selectedEmails);
    setSelectedEmails([]);
  }

  return (
    <div className="space-y-2">
      {selectedResendableCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="brand"
            size="sm"
            type="button"
            className="h-9 px-3 text-sm"
            disabled={selectionBusy}
            onClick={() => void handleBulkResend()}
          >
            {bulkResending
              ? "Resending Invites…"
              : `Resend Invite (${selectedResendableCount})`}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-9 px-3 text-sm"
            disabled={selectionBusy}
            onClick={() => setSelectedEmails([])}
          >
            Clear Selection
          </Button>
        </div>
      ) : null}
      <div
        className="relative wt-scroll-both-chain max-h-[min(70vh,520px)] rounded-xl border border-wt-border"
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
        <WtTable className="min-w-max">
          <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
                <TableCheckbox
                  checked={allResendableOnPageSelected}
                  indeterminate={someResendableOnPageSelected}
                  disabled={!resendableEmailsOnPage.length || selectionBusy}
                  onCheckedChange={(checked) => toggleSelectAllOnPage(checked)}
                  aria-label="Select all resendable employees on this page"
                />
              </TableHead>
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
              const canResend = isResendableInvitedEmployeeRow(row);
              const isResending = Boolean(email && resendingEmail === email);
              const isSelected = Boolean(email && selectedEmails.includes(email));
              const rowKey = String(row.emp_id ?? email ?? idx);
              const employeeName = resolveEmployeeNameFromRow(row);

              return (
                <TableRow
                  key={rowKey}
                  className={isSelected ? "bg-indigo-50/70" : undefined}
                >
                  <TableCell className="px-3 py-2">
                    {canResend ? (
                      <TableCheckbox
                        checked={isSelected}
                        disabled={selectionBusy || isResending}
                        onCheckedChange={(checked) => toggleRowSelection(email, checked)}
                        aria-label={`Select ${employeeName}`}
                      />
                    ) : null}
                  </TableCell>
                  {displayColumns.map((col) => (
                    <TableCell key={col} className="px-3 py-2 whitespace-nowrap">
                      {formatTableCellValue(col, row[col])}
                    </TableCell>
                  ))}
                  <TableCell className="px-3 py-2 whitespace-nowrap">
                    {canResend && selectedResendableCount === 0 ? (
                      <Button
                        variant="brand"
                        size="xs"
                        type="button"
                        className="px-2.5 py-1 text-xs"
                        disabled={selectionBusy || isResending}
                        onClick={() => onResendInvite(email)}
                      >
                        {isResending ? "Resending Invite…" : "Resend Invite"}
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
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
      />
    </div>
  );
}
