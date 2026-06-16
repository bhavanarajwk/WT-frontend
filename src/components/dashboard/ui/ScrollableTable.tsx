import type { HTMLAttributes, ReactNode } from "react";

export const SCROLLABLE_TABLE_CLASS = "wt-scrollable-table text-sm";

export const STICKY_TABLE_HEAD_CLASS = "wt-table-sticky-head text-wt-text-muted";

export const SCROLLABLE_TABLE_SHELL_CLASS =
  "wt-scroll-both overflow-auto rounded-xl border border-wt-border";

type ScrollableTableProps = HTMLAttributes<HTMLDivElement> & {
  maxHeightClass?: string;
};

/** Bounded scroll region so table header cells can stick while body scrolls. */
export function ScrollableTable({
  children,
  className = "",
  maxHeightClass = "max-h-[min(70vh,520px)]",
  ...props
}: ScrollableTableProps) {
  return (
    <div
      className={`${SCROLLABLE_TABLE_SHELL_CLASS} ${maxHeightClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
