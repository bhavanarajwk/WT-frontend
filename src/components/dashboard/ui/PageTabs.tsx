"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGE_STACK_CLASS } from "@/components/dashboard/ui/uiLayout";
import { cn } from "@/lib/utils";

export type PageTabItem = {
  value: string;
  label: string;
  disabled?: boolean;
};

/** Vertical space from card edge to tabs, and from divider to tab content. */
export const PAGE_TAB_EDGE_GAP_CLASS = "pt-5 sm:pt-6";

const PAGE_TABS_EMBEDDED_HEADER_CLASS = cn(
  "w-full border-b border-wt-border px-4 pb-4 sm:px-6",
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
    <TabsList aria-label={ariaLabel} className="h-auto flex-wrap gap-2 bg-transparent p-0">
      {items.map((item) => (
        <TabsTrigger
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className="rounded-lg px-3 py-2 text-sm"
        >
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

export { CONTENT_CARD_CLASS as PAGE_CONTENT_CARD_CLASS } from "@/components/dashboard/ui/uiLayout";

/** Use directly below embedded `PageTabs` for consistent tab-to-content spacing. */
export const PAGE_TAB_BODY_CLASS = cn(
  PAGE_TAB_EDGE_GAP_CLASS,
  PAGE_STACK_CLASS,
  "px-4 pb-5 sm:px-6 sm:pb-6"
);
