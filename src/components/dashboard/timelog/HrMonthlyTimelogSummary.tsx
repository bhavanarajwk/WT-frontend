"use client";

import { Button } from "@/components/ui/button";
import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
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
          <Button variant="outline" size="sm" type="button" disabled={loading} onClick={() => onMonthChange(shiftMonth(month, -1))}>
            Previous month
          </Button>
          <span className="min-w-[10rem] text-center text-sm font-semibold tabular-nums">
            {formatMonthYearLabel(month)}
          </span>
          <Button variant="outline" size="sm" type="button" disabled={loading || isCurrentMonth} onClick={() => onMonthChange(shiftMonth(month, 1))}>
            Next month
          </Button>
        </div>
        <Button variant="outline" size="sm" type="button" disabled={loading} onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <SectionLoading className="py-10" label="Loading approved hours…" />
      ) : !rows.length ? (
        <p className="py-10 text-center text-sm text-wt-text-muted">
          No approved timelog hours for this month.
        </p>
      ) : (
        <ScrollableTable maxHeightClass="max-h-[min(70vh,520px)]">
          <WtTable>
            <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-[1] bg-wt-surface-1">
                  Employee
                </TableHead>
                {weekStarts.map((weekStart, index) => (
                  <TableHead key={weekStart} className="text-center">
                    {weekColumnLabel(index)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const openWeek = defaultWeekForRow(row);
                const rowClickable = Boolean(onRowClick && openWeek);
                return (
                  <TableRow
                    key={row.email}
                    className={`group ${
                      rowClickable ? "cursor-pointer hover:bg-wt-page-bg/50" : ""
                    }`}
                    onClick={() => {
                      if (rowClickable && openWeek) onRowClick?.(row, openWeek);
                    }}
                  >
                    <TableCell className="sticky left-0 z-[1] bg-wt-surface-1 whitespace-nowrap group-hover:bg-wt-page-bg/50">
                      {row.label}
                    </TableCell>
                    {weekStarts.map((weekStart) => {
                      const hasHours = Number(row.hoursByWeek[weekStart] ?? 0) > 0;
                      return (
                        <TableCell
                          key={`${row.email}-${weekStart}`}
                          className={`text-center tabular-nums${
                            hasHours && onRowClick ? "" : ""
                          }`}
                          onClick={(event) => {
                            if (!onRowClick || !hasHours) return;
                            event.stopPropagation();
                            onRowClick(row, weekStart);
                          }}
                        >
                          {formatSummaryHours(row.hoursByWeek[weekStart])}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </WtTable>
        </ScrollableTable>
      )}
    </div>
  );
}
