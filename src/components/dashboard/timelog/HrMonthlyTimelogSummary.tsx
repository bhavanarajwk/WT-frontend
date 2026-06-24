"use client";

import {
  formatMonthYearLabel,
  formatSummaryHours,
  shiftMonth,
  weekColumnLabel,
  type MonthRef,
} from "@/utils/timelog/monthWeeks";
import type { HrMonthlyTimelogRow } from "@/hooks/timelog/useHrMonthlyTimelogSummary";

type HrMonthlyTimelogSummaryProps = {
  month: MonthRef;
  onMonthChange: (month: MonthRef) => void;
  weekStarts: string[];
  rows: HrMonthlyTimelogRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onRowClick?: (row: HrMonthlyTimelogRow, weekStart: string) => void;
};

export function HrMonthlyTimelogSummary({
  month,
  onMonthChange,
  weekStarts,
  rows,
  loading,
  error,
  onRefresh,
  onRowClick,
}: HrMonthlyTimelogSummaryProps) {
  const defaultWeekForRow = (row: HrMonthlyTimelogRow): string | null => {
    const withHours = weekStarts.find((weekStart) => Number(row.hoursByWeek[weekStart] ?? 0) > 0);
    return withHours ?? weekStarts[0] ?? null;
  };
  const isCurrentMonth =
    month.year === new Date().getFullYear() && month.month === new Date().getMonth();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost rounded-lg border border-wt-border px-3 py-1.5 text-sm"
            disabled={loading}
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            Previous month
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold tabular-nums">
            {formatMonthYearLabel(month)}
          </span>
          <button
            type="button"
            className="btn-ghost rounded-lg border border-wt-border px-3 py-1.5 text-sm"
            disabled={loading || isCurrentMonth}
            onClick={() => onMonthChange(shiftMonth(month, 1))}
          >
            Next month
          </button>
        </div>
        <button
          type="button"
          className="btn-ghost rounded-lg border border-wt-border px-3 py-2 text-sm"
          disabled={loading}
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-10 text-center text-sm text-wt-text-muted">Loading approved hours…</p>
      ) : !rows.length ? (
        <p className="py-10 text-center text-sm text-wt-text-muted">
          No approved timelog hours for this month.
        </p>
      ) : (
        <div className="wt-scroll-both overflow-x-auto rounded-lg border border-wt-border">
          <table className="min-w-full text-sm">
            <thead className="bg-wt-surface-2 text-wt-text-muted">
              <tr>
                <th className="sticky left-0 z-[1] bg-wt-surface-2 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Employee
                </th>
                {weekStarts.map((weekStart, index) => (
                  <th
                    key={weekStart}
                    className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide"
                  >
                    {weekColumnLabel(index)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const openWeek = defaultWeekForRow(row);
                const rowClickable = Boolean(onRowClick && openWeek);
                return (
                  <tr
                    key={row.email}
                    className={`group border-t border-wt-border ${
                      rowClickable ? "cursor-pointer hover:bg-wt-surface-2/80" : ""
                    }`}
                    onClick={() => {
                      if (rowClickable && openWeek) onRowClick?.(row, openWeek);
                    }}
                  >
                    <td className="sticky left-0 z-[1] bg-wt-surface-1 px-4 py-3 font-medium whitespace-nowrap group-hover:bg-wt-surface-2">
                      {row.label}
                    </td>
                    {weekStarts.map((weekStart) => {
                      const hasHours = Number(row.hoursByWeek[weekStart] ?? 0) > 0;
                      return (
                        <td
                          key={`${row.email}-${weekStart}`}
                          className={`px-4 py-3 text-center tabular-nums text-wt-text ${
                            hasHours && onRowClick ? "hover:text-indigo-700" : ""
                          }`}
                          onClick={(event) => {
                            if (!onRowClick || !hasHours) return;
                            event.stopPropagation();
                            onRowClick(row, weekStart);
                          }}
                        >
                          {formatSummaryHours(row.hoursByWeek[weekStart])}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
