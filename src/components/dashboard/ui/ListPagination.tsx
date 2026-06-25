import { Button } from "@/components/ui/button";
import { UI_COPY } from "@/constants/uiCopy";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function ListPagination({
  page,
  totalPages,
  totalItems,
  rangeStart: _rangeStart,
  rangeEnd: _rangeEnd,
  pageSize,
  pageSizeOptions: _pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange: _onPageSizeChange,
  className = "",
  showPageSizeSelector: _showPageSizeSelector = false,
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
  showPageSizeSelector?: boolean;
}) {
  if (totalItems <= 0) return null;

  const isFirstPage = page <= 0;
  const isLastPage = page + 1 >= totalPages;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 mt-3 text-sm text-wt-text-muted ${className}`.trim()}
    >
      <span className="text-xs tabular-nums">
        {page + 1} of {totalPages}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFirstPage}
          aria-disabled={isFirstPage}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          {UI_COPY.previous}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLastPage}
          aria-disabled={isLastPage}
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        >
          {UI_COPY.next}
        </Button>
      </div>
    </div>
  );
}
