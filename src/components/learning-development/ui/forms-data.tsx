"use client";

import { isValidElement, type ReactNode, useMemo, useState } from "react";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  activeSortDirectionForColumn,
  applyListSort,
  sortOptionsForColumn,
  toggleColumnSort,
  type ListSortOption,
} from "@/utils/listSort";
import { formatTableColumnHeader, prepareTableForDisplay } from "@/utils/tableDisplay";

export function DataTable({
  title,
  columns,
  rows,
  emptyLabel,
  compact = false,
  sortOptions,
  defaultSortId,
  sortId: controlledSortId,
  onSortIdChange,
  paginate = true,
  pageSize: initialPageSize,
  resetPaginationKeys,
}: {
  title?: string;
  columns: string[];
  rows: Array<Record<string, unknown | ReactNode>>;
  emptyLabel: string;
  compact?: boolean;
  sortOptions?: ListSortOption<Record<string, unknown>>[];
  defaultSortId?: string;
  sortId?: string;
  onSortIdChange?: (sortId: string) => void;
  paginate?: boolean;
  pageSize?: number;
  resetPaginationKeys?: readonly unknown[];
}) {
  const [internalSortId, setInternalSortId] = useState(
    () => defaultSortId ?? sortOptions?.[0]?.id ?? ""
  );
  const sortId = controlledSortId ?? internalSortId;
  const setSortId = onSortIdChange ?? setInternalSortId;

  const { columns: displayColumns, rows: displaySourceRows } = useMemo(
    () =>
      prepareTableForDisplay(
        columns,
        rows.map((row) => ({ ...row })) as Array<Record<string, unknown>>
      ),
    [columns, rows]
  );

  const sortedRows = useMemo(() => {
    if (!sortOptions?.length) return displaySourceRows;
    return applyListSort(displaySourceRows, sortId, sortOptions);
  }, [displaySourceRows, sortId, sortOptions]);

  const pagination = useClientPagination(sortedRows, {
    pageSize: initialPageSize,
    resetKeys: resetPaginationKeys ?? (sortOptions?.length ? [sortId] : undefined),
  });

  const displayRows = sortedRows;

  if (!displaySourceRows.length) {
    return (
      <div className="rounded-xl border border-dashed border-wt-border bg-wt-surface-2/40 p-8 text-center">
        {title ? <p className="text-sm font-medium mb-1">{title}</p> : null}
        <p className="text-sm text-wt-text-muted">{emptyLabel}</p>
      </div>
    );
  }
  const cellClass = compact ? "px-2 py-1.5 whitespace-nowrap" : "px-3 py-2 whitespace-nowrap";
  const headCellClass = compact
    ? "text-left px-2 py-2 font-medium whitespace-nowrap"
    : "text-left px-3 py-2 font-medium whitespace-nowrap";
  return (
    <div className="space-y-2">
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      <div className="wt-scroll-both max-h-[min(70vh,560px)] rounded-xl border border-wt-border overflow-auto">
        <table className="wt-scrollable-table text-sm">
          <thead className="wt-table-sticky-head text-wt-text-muted">
            <tr>
              {displayColumns.map((col) => {
                const columnSortOpts = sortOptions?.length ? sortOptionsForColumn(col, sortOptions) : [];
                const activeDir =
                  sortOptions?.length && columnSortOpts.length
                    ? activeSortDirectionForColumn(col, sortId, sortOptions)
                    : null;
                return (
                  <th key={col} className={headCellClass}>
                    <TableSortHeader
                      label={formatTableColumnHeader(col)}
                      activeDirection={activeDir}
                      sortable={columnSortOpts.length > 0}
                      onSort={
                        columnSortOpts.length && sortOptions
                          ? () => setSortId(toggleColumnSort(col, sortId, sortOptions))
                          : undefined
                      }
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="[&_tr:hover]:bg-wt-surface-2/60">
            {displayRows.map((row, idx) => (
              <tr key={idx} className="border-t border-wt-border">
                {displayColumns.map((col) => (
                  <td key={col} className={cellClass}>
                    {row[col] === null || row[col] === undefined
                      ? "—"
                      : isValidElement(row[col])
                        ? (row[col] as ReactNode)
                        : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.trim().toUpperCase();
  const tone =
    s === "COMPLETED"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
      : s === "CANCELLED"
        ? "bg-rose-500/15 text-rose-700 border-rose-500/30"
        : s === "IN_PROGRESS" || s === "SCHEDULED"
          ? "bg-sky-500/15 text-sky-800 border-sky-500/30"
          : "bg-wt-surface-2 text-wt-text-muted border-wt-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>{status}</span>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" aria-label="Close panel" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-wt-border bg-wt-surface-1 shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-wt-border px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="rounded-lg p-2 text-wt-text-muted hover:bg-wt-surface-2" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-wt-border px-5 py-4">{footer}</div> : null}
      </aside>
    </div>
  );
}
