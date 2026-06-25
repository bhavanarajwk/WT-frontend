import type { HTMLAttributes } from "react";

export const SCROLLABLE_TABLE_CLASS = "wt-scrollable-table text-sm";

export const STICKY_TABLE_HEAD_CLASS = "wt-table-sticky-head [&_tr]:border-b";

export const SCROLLABLE_TABLE_SHELL_CLASS =
  "wt-scroll-both overflow-auto rounded-xl border border-wt-border";

export const SCROLLABLE_TABLE_SHELL_CHAIN_CLASS =
  "wt-scroll-both-chain overflow-auto rounded-xl border border-wt-border";

type ScrollableTableProps = HTMLAttributes<HTMLDivElement> & {
  maxHeightClass?: string;
  /** Allow scroll to continue on the parent once this region hits its edge. */
  scrollChain?: boolean;
};

/** Bounded scroll region so table header cells can stick while body scrolls. */
export function ScrollableTable({
  children,
  className = "",
  maxHeightClass = "max-h-[min(70vh,520px)]",
  scrollChain = false,
  ...props
}: ScrollableTableProps) {
  const shellClass = scrollChain ? SCROLLABLE_TABLE_SHELL_CHAIN_CLASS : SCROLLABLE_TABLE_SHELL_CLASS;
  return (
    <div
      className={`${shellClass} ${maxHeightClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
