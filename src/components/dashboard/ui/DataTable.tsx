"use client";

import { useMemo, useState } from "react";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { ListSortSelect, sortOptionMeta } from "@/components/dashboard/ui/ListSortSelect";
import { useClientPagination } from "@/hooks/useClientPagination";
import { applyListSort, type ListSortOption } from "@/utils/listSort";

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

  const sortedRows = useMemo(() => {
    if (!sortOptions?.length) return rows;
    return applyListSort(rows, sortId, sortOptions);
  }, [rows, sortId, sortOptions]);

  const pagination = useClientPagination(sortedRows, {
    pageSize: initialPageSize,
    resetKeys: resetPaginationKeys ?? (sortOptions?.length ? [sortId] : undefined),
  });

  const displayRows = paginate ? pagination.pageItems : sortedRows;

  if (!rows.length) {
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
      {title || sortOptions?.length ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          {title ? <p className="text-sm font-medium">{title}</p> : <span />}
          {sortOptions?.length ? (
            <ListSortSelect
              value={sortId}
              onChange={setSortId}
              options={sortOptionMeta(sortOptions)}
              className="ml-auto"
            />
          ) : null}
        </div>
      ) : null}
      <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
        <table className="min-w-full text-sm">
          <thead className="bg-wt-surface-2 text-wt-text-muted">
            <tr>
              {columns.map((col) => (
                <th key={col} className={headCellClass}>
                  {col.replaceAll("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => (
              <tr key={idx} className="border-t border-wt-border">
                {columns.map((col) => (
                  <td key={col} className={cellClass}>
                    {row[col] === null || row[col] === undefined ? "—" : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginate ? (
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
