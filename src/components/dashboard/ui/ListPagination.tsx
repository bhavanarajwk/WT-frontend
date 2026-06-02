"use client";

import { PAGE_SIZE_OPTIONS } from "@/hooks/useClientPagination";

export function ListPagination({
  page,
  totalPages,
  totalItems,
  rangeStart,
  rangeEnd,
  pageSize,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange: _onPageSizeChange,
  className = "",
  showRangeText = false,
  showPageSizeSelector: _showPageSizeSelector = false,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
  showRangeText?: boolean;
  showPageSizeSelector?: boolean;
}) {
  if (totalItems <= 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-wt-border pt-3 text-sm text-wt-text-muted ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs tabular-nums">{page + 1} of {totalPages}</span>
        {showRangeText ? (
          <span>
            Showing {rangeStart}–{rangeEnd} of {totalItems}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-ghost px-3 py-1.5 text-xs"
          disabled={page <= 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn-ghost px-3 py-1.5 text-xs"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
