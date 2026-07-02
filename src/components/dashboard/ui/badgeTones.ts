/** Filled status badges — no outline border, semantic background colors. */
export const FILLED_BADGE_BASE = "border-transparent";

export const BADGE_TONE = {
  success:
    "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  danger: "bg-destructive/15 text-destructive dark:bg-destructive/20",
  warning: "bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300",
  info: "bg-sky-500/15 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
  violet: "bg-violet-500/15 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
  neutral: "bg-muted text-wt-text-muted dark:bg-wt-surface-3 dark:text-wt-text-muted",
  slate: "bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
} as const;

export function filledBadgeClass(tone: keyof typeof BADGE_TONE): string {
  return `${FILLED_BADGE_BASE} ${BADGE_TONE[tone]}`;
}
