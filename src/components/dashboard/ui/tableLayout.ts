/** Unified typography for all data tables. */
export const WT_TABLE_TEXT_CLASS = "text-sm text-wt-text-muted";

export const WT_TABLE_HEAD_CLASS =
  "px-3 py-2.5 text-left align-middle font-medium whitespace-nowrap text-sm text-wt-text-muted";

export const WT_TABLE_CELL_CLASS =
  "px-3 py-2.5 align-middle whitespace-nowrap text-sm text-wt-text-muted";

export const WT_TABLE_BODY_CELL_CLASS = WT_TABLE_CELL_CLASS;

/** Sticky header row — layout only; text uses WT_TABLE_HEAD_CLASS on each th. */
export const WT_STICKY_TABLE_HEAD_CLASS = "wt-table-sticky-head [&_tr]:border-b";
