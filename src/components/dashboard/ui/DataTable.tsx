"use client";

import { useMemo, useState } from "react";
import {
  SCROLLABLE_TABLE_CLASS,
  ScrollableTable,
  STICKY_TABLE_HEAD_CLASS,
} from "@/components/dashboard/ui/ScrollableTable";
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
  rows: Array<Record<string, unknown>>;
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
    () => prepareTableForDisplay(columns, rows),
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
      <div className="space-y-1">
        {title ? <p className="text-sm font-medium">{title}</p> : null}
        <p className="text-sm text-wt-text-muted">{emptyLabel}</p>
      </div>
    );
  }

  const cellClass = compact ? "px-1.5 py-1 whitespace-nowrap" : "px-3 py-2 whitespace-nowrap";
  const headCellClass = compact
    ? "text-left px-1.5 py-1 font-medium whitespace-nowrap"
    : "text-left px-3 py-2 font-medium whitespace-nowrap";

  return (
    <div className="space-y-2">
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      <ScrollableTable>
        <table className={SCROLLABLE_TABLE_CLASS}>
          <thead className={STICKY_TABLE_HEAD_CLASS}>
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
          <tbody>
            {displayRows.map((row, idx) => (
              <tr key={idx} className="border-t border-wt-border">
                {displayColumns.map((col) => (
                  <td key={col} className={cellClass}>
                    {row[col] === null || row[col] === undefined ? "—" : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </div>
  );
}
