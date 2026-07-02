"use client";

import { isValidElement, type ReactNode, useMemo, useState } from "react";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { PageSectionHeader } from "@/components/dashboard/ui/PageSectionHeader";
import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
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
  maxHeightClass,
  scrollChain = false,
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
  maxHeightClass?: string;
  scrollChain?: boolean;
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

  useClientPagination(sortedRows, {
    pageSize: initialPageSize,
    resetKeys: resetPaginationKeys ?? (sortOptions?.length ? [sortId] : undefined),
  });

  const displayRows = sortedRows;

  if (!displaySourceRows.length) {
    return (
      <div className="space-y-3">
        {title ? <PageSectionHeader title={title} titleAs="h4" /> : null}
        <EmptyState title={emptyLabel} description="There is nothing to show in this table yet." />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title ? <PageSectionHeader title={title} titleAs="h4" /> : null}
      <ScrollableTable maxHeightClass={maxHeightClass} scrollChain={scrollChain}>
        <WtTable>
          <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
            <TableRow className="hover:bg-transparent">
              {displayColumns.map((col) => {
                const columnSortOpts = sortOptions?.length ? sortOptionsForColumn(col, sortOptions) : [];
                const activeDir =
                  sortOptions?.length && columnSortOpts.length
                    ? activeSortDirectionForColumn(col, sortId, sortOptions)
                    : null;
                return (
                  <TableHead key={col}>
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
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, idx) => (
              <TableRow key={idx}>
                {displayColumns.map((col) => (
                  <TableCell key={col}>
                    {row[col] === null || row[col] === undefined
                      ? "—"
                      : isValidElement(row[col])
                        ? (row[col] as ReactNode)
                        : String(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </WtTable>
      </ScrollableTable>
    </div>
  );
}
