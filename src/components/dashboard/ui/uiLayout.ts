/** Shared layout class names for sections, forms, and detail tables. */

import { cn } from "@/lib/utils";

export const PAGE_STACK_CLASS = "space-y-6";
export const SECTION_STACK_CLASS = PAGE_STACK_CLASS;
export const SECTION_HEADER_CLASS = "mb-4 border-b border-wt-border pb-3";
export const SECTION_TITLE_CLASS = "text-base font-semibold tracking-tight text-wt-text";
export const SECTION_DESCRIPTION_CLASS = "mt-1.5 text-sm leading-relaxed text-wt-text-muted";

/** Primary content card used on tabbed pages (Leave, Timelog, etc.). */
export const CONTENT_CARD_CLASS =
  "overflow-hidden rounded-2xl border border-wt-border bg-wt-surface-1 shadow-sm";

/** Nested panel inside a content card. */
export const INNER_PANEL_CLASS =
  "rounded-xl border border-wt-border bg-wt-surface-2/35 p-4 sm:p-5";

/** Info / notice banner — works in light and dark mode. */
export const INFO_BANNER_CLASS =
  "rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-wt-text";

export const INFO_BANNER_TITLE_CLASS = "font-medium text-wt-text";
export const INFO_BANNER_BODY_CLASS = "mt-1 leading-relaxed text-wt-text-muted";

/** Default max height for scrollable data tables. */
export const DEFAULT_TABLE_MAX_HEIGHT = "max-h-[min(65vh,560px)]";

/** Card shell zones — shared horizontal padding with matched vertical rhythm. */
export const CARD_HEADER_CLASS = "px-4 py-4 sm:px-6 sm:py-5";
export const CARD_TOOLBAR_CLASS = "px-4 py-4 sm:px-6 sm:py-5";
export const CARD_CONTENT_CLASS = "p-4 sm:p-6";
export const CARD_CONTENT_BELOW_TOOLBAR_CLASS = "px-4 pb-4 pt-0 sm:px-6 sm:pb-6";
export const CARD_FOOTER_CLASS = "px-4 py-4 sm:px-6 sm:py-5";
export const CARD_STACK_CLASS = "space-y-6";
export const CARD_TOOLBAR_INNER_CLASS =
  "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between";
export const CARD_CONTENT_STACK_CLASS = "space-y-6";
export const CARD_FORM_GRID_CLASS = "grid gap-3 sm:grid-cols-2";
export const CARD_FORM_ACTIONS_CLASS = "flex flex-wrap gap-3 pt-6";

export const FORM_FIELD_CLASS = "flex flex-col gap-1.5";
export const FIELD_LABEL_CLASS = "text-sm font-medium leading-none text-wt-text";
/** Shared height/padding for text inputs and selects in forms. */
export const FORM_CONTROL_CLASS = cn(
  "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
);
export const FORM_CONTROL_WITH_CHEVRON_CLASS = cn(FORM_CONTROL_CLASS, "pr-10");

export const DETAIL_LABEL_CELL_CLASS =
  "w-[34%] min-w-[9.5rem] whitespace-nowrap align-top px-3 py-2.5 text-sm text-wt-text-muted";
export const DETAIL_VALUE_CELL_CLASS =
  "align-top px-3 py-2.5 text-sm text-wt-text";
