"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type PageTabItem = {
  value: string;
  label: string;
  disabled?: boolean;
};

/** Vertical space from card edge to tabs, and from divider to tab content. */
export const PAGE_TAB_EDGE_GAP_CLASS = "pt-6";

const PAGE_TABS_EMBEDDED_HEADER_CLASS = cn(
  "w-full border-b border-wt-border px-5 pb-4",
  PAGE_TAB_EDGE_GAP_CLASS
);

/** Shadcn tabs for in-page section switching. Use `embedded` when tabs sit inside a content card. */
export function PageTabs({
  value,
  onValueChange,
  items,
  className,
  embedded = false,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange?: (value: string) => void;
  items: readonly PageTabItem[];
  className?: string;
  /** Tabs rendered at the top of a white content card. */
  embedded?: boolean;
  "aria-label"?: string;
}) {
  if (!items.length) return null;

  const tabsList = (
    <TabsList aria-label={ariaLabel} className="gap-3 bg-transparent p-0">
      {items.map((item) => (
        <TabsTrigger key={item.value} value={item.value} disabled={item.disabled}>
          {item.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );

  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("gap-0", className)}>
      {embedded ? <div className={PAGE_TABS_EMBEDDED_HEADER_CLASS}>{tabsList}</div> : tabsList}
    </Tabs>
  );
}

export const PAGE_CONTENT_CARD_CLASS =
  "rounded-2xl border border-wt-border bg-wt-surface-1";

/** Use directly below embedded `PageTabs` for consistent tab-to-content spacing. */
export const PAGE_TAB_BODY_CLASS = cn(
  PAGE_TAB_EDGE_GAP_CLASS,
  "space-y-4 px-5 pb-5"
);
