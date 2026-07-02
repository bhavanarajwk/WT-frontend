"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SortDirection } from "@/utils/listSort";
import { cn } from "@/lib/utils";

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
    return <span className={cn("text-sm font-medium text-wt-text-muted", className)}>{label}</span>;
  }

  const SortIcon =
    activeDirection === "asc" ? ArrowUp : activeDirection === "desc" ? ArrowDown : ChevronsUpDown;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onSort}
      className={cn(
        "-ml-2 h-8 px-2 text-sm font-medium text-wt-text-muted hover:bg-transparent hover:text-wt-text-muted",
        className
      )}
      aria-label={`Sort by ${label}`}
      aria-sort={
        activeDirection === "asc"
          ? "ascending"
          : activeDirection === "desc"
            ? "descending"
            : "none"
      }
    >
      <span>{label}</span>
      <SortIcon
        className={cn(
          "size-3.5 shrink-0",
          activeDirection ? "text-wt-text" : "text-wt-text-muted"
        )}
        aria-hidden
      />
    </Button>
  );
}
