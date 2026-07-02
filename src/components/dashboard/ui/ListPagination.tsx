"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UI_COPY } from "@/constants/uiCopy";
import { buildPaginationTokens } from "@/utils/pagination";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function ChevronLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ListPagination({
  page,
  totalPages,
  totalItems,
  rangeStart,
  rangeEnd,
  pageSize,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  className = "",
  showPageNumbers = true,
  loading = false,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart?: number;
  rangeEnd?: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
  showPageNumbers?: boolean;
  loading?: boolean;
}) {
  if (totalItems <= 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const isFirstPage = page <= 0;
  const isLastPage = page + 1 >= safeTotalPages;
  const pageTokens =
    showPageNumbers && safeTotalPages > 1
      ? buildPaginationTokens(page, safeTotalPages)
      : [];
  const hasRange = rangeStart != null && rangeEnd != null;
  const showPageSize = Boolean(onPageSizeChange) && pageSizeOptions.length > 1;
  const pageSizeSelectOptions = pageSizeOptions.map((size) => ({
    value: String(size),
    label: String(size),
  }));

  const summary = hasRange
    ? `Showing ${rangeStart}–${rangeEnd} of ${totalItems}`
    : `Page ${page + 1} of ${safeTotalPages}`;

  return (
    <div
      className={`mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs tabular-nums text-wt-text-muted">{summary}</p>
        {showPageSize ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-wt-text-muted">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(next) => {
                const parsed = Number(next);
                if (Number.isFinite(parsed) && parsed > 0) {
                  onPageSizeChange?.(parsed);
                }
              }}
              items={pageSizeSelectOptions}
              disabled={loading}
            >
              <SelectTrigger
                aria-label="Rows per page"
                className="h-8 w-[4.25rem] rounded-lg border-wt-border bg-wt-surface-1 px-2 text-xs tabular-nums shadow-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeSelectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {safeTotalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center gap-1.5"
          aria-label="Pagination"
        >
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-lg border-wt-border bg-wt-surface-1 shadow-sm transition-colors duration-150"
            disabled={isFirstPage || loading}
            aria-label={UI_COPY.previous}
            onClick={() => onPageChange(Math.max(0, page - 1))}
          >
            <ChevronLeftIcon />
          </Button>

          {pageTokens.length > 0 ? (
            <div
              className="inline-flex items-center gap-0.5 rounded-lg border border-wt-border bg-wt-surface-1 p-0.5 shadow-sm"
              role="group"
              aria-label="Page numbers"
            >
              {pageTokens.map((token, index) =>
                token === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="inline-flex h-7 min-w-7 items-center justify-center px-1 text-xs text-wt-text-muted"
                    aria-hidden
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={token}
                    type="button"
                    variant={token === page ? "brand" : "ghost"}
                    size="sm"
                    className={`h-7 min-w-7 rounded-md px-2 tabular-nums transition-colors duration-150 ${
                      token === page
                        ? "shadow-sm"
                        : "text-wt-text-muted hover:bg-wt-surface-2 hover:text-wt-text"
                    }`}
                    aria-current={token === page ? "page" : undefined}
                    aria-label={`Page ${token + 1}`}
                    disabled={loading}
                    onClick={() => onPageChange(token)}
                  >
                    {token + 1}
                  </Button>
                )
              )}
            </div>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-lg border-wt-border bg-wt-surface-1 shadow-sm transition-colors duration-150"
            disabled={isLastPage || loading}
            aria-label={UI_COPY.next}
            onClick={() => onPageChange(Math.min(safeTotalPages - 1, page + 1))}
          >
            <ChevronRightIcon />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
