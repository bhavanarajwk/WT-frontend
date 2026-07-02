import { cn } from "@/lib/utils";

/** Sidebar shell — matches dashboard card surfaces. */
export const SIDEBAR_SHELL_CLASS =
  "wt-sidebar sticky top-0 z-20 flex max-h-[min(36vh,260px)] shrink-0 flex-col overflow-x-hidden border-b border-wt-border bg-wt-surface-1 p-4 max-lg:relative max-lg:min-h-0 lg:h-dvh lg:max-h-dvh lg:w-[264px] lg:min-w-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-5";

export const SIDEBAR_BRAND_WRAP_CLASS =
  "mb-5 shrink-0 border-b border-wt-border/80 pb-5";

export const SIDEBAR_NAV_CLASS =
  "wt-sidebar-nav min-h-0 min-w-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto pr-0.5";

export const SIDEBAR_GROUP_STACK_CLASS = "space-y-0.5";

export const SIDEBAR_CHILDREN_WRAP_CLASS =
  "ml-2.5 min-w-0 space-y-0.5 border-l border-wt-border/70 py-0.5 pl-2.5";

export const SIDEBAR_FOOTER_CLASS = "mt-4 shrink-0";

export const SIDEBAR_FOOTER_CARD_CLASS =
  "rounded-2xl border border-wt-border bg-wt-surface-2/80 p-1.5 shadow-sm";

export const SIDEBAR_PARENT_TEXT = "text-sm leading-snug";

export const SIDEBAR_CHILD_TEXT = "text-xs leading-snug";

export const SIDEBAR_NAV_LABEL = "min-w-0 flex-1 text-left";

export const SIDEBAR_ICON_WRAP = "size-4 shrink-0 opacity-90";

export const SIDEBAR_CHILD_ICON_WRAP = "size-3.5 shrink-0 opacity-80";

const SIDEBAR_PARENT_BASE =
  "relative flex h-auto min-h-9 w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2.5 font-normal whitespace-normal transition-all duration-150 ease-out";

const SIDEBAR_CHILD_BASE =
  "relative flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 font-normal whitespace-normal transition-all duration-150 ease-out";

const SIDEBAR_ACTIVE_CLASS =
  "bg-wt-surface-3 text-wt-text shadow-sm ring-1 ring-wt-border before:absolute before:left-1.5 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--wt-brand)]";

const SIDEBAR_IDLE_CLASS =
  "text-wt-text-muted hover:bg-wt-surface-2 hover:text-wt-text";

export function sidebarParentNavClass(active: boolean, extra?: string) {
  return cn(SIDEBAR_PARENT_BASE, SIDEBAR_PARENT_TEXT, active ? SIDEBAR_ACTIVE_CLASS : SIDEBAR_IDLE_CLASS, extra);
}

export function sidebarChildNavClass(active: boolean, extra?: string) {
  return cn(
    SIDEBAR_CHILD_BASE,
    SIDEBAR_CHILD_TEXT,
    active ? cn(SIDEBAR_ACTIVE_CLASS, "font-medium") : SIDEBAR_IDLE_CLASS,
    extra
  );
}

export function sidebarChildBlockClass(active: boolean, extra?: string) {
  return cn(
    "block w-full min-w-0 rounded-lg px-2.5 py-2 text-left transition-all duration-150 ease-out",
    SIDEBAR_CHILD_TEXT,
    active ? cn(SIDEBAR_ACTIVE_CLASS, "font-medium") : SIDEBAR_IDLE_CLASS,
    extra
  );
}

export function sidebarProfileLinkClass(active: boolean) {
  return cn(
    "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-150 ease-out",
    active
      ? "bg-wt-surface-3 text-wt-text ring-1 ring-wt-border"
      : "text-wt-text-muted hover:bg-wt-surface-3/70 hover:text-wt-text"
  );
}

export function sidebarLogoutButtonClass() {
  return cn(
    "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-wt-border bg-wt-surface-1 text-wt-text-muted shadow-sm transition-all duration-150 ease-out hover:bg-wt-surface-3 hover:text-wt-text"
  );
}

/** @deprecated Use sidebarParentNavClass */
export const SIDEBAR_NAV_ROW = SIDEBAR_PARENT_BASE;

/** @deprecated Use sidebarChildNavClass */
export const SIDEBAR_CHILD_ROW = SIDEBAR_CHILD_BASE;

/** @deprecated Use sidebarChildBlockClass */
export const SIDEBAR_CHILD_BLOCK =
  "block w-full min-w-0 rounded-lg px-2.5 py-2 text-left whitespace-normal";
