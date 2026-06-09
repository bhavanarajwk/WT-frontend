"use client";

import type { SortDirection } from "@/utils/listSort";

export function TableSortHeader({
  label,
  activeDirection = null,
  sortable = false,
  onSort,
  className = "",
}: {
  label: string;
  activeDirection?: SortDirection | null;
  sortable?: boolean;
  onSort?: () => void;
  className?: string;
}) {
  if (!sortable || !onSort) {
    return <span className={className}>{label}</span>;
  }

  return (
    <button
      type="button"
      onClick={onSort}
      className={`inline-flex items-center gap-1 font-medium text-inherit hover:text-wt-text ${className}`.trim()}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      <span className="inline-flex flex-col leading-none" aria-hidden>
        <SortArrow direction={activeDirection} />
      </span>
    </button>
  );
}

function SortArrow({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" className="text-wt-text">
        <path d="M6 3l3.5 4.5H2.5L6 3z" fill="currentColor" />
      </svg>
    );
  }
  if (direction === "desc") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" className="text-wt-text">
        <path d="M6 9L2.5 4.5h7L6 9z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="text-wt-text-muted/70">
      <path d="M6 2.5L8 5.5H4L6 2.5z" fill="currentColor" />
      <path d="M6 9.5L4 6.5h4L6 9.5z" fill="currentColor" />
    </svg>
  );
}
