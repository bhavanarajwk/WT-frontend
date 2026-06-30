"use client";

import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { useMemo, useState } from "react";
import type { TimelogWeekSnapshot } from "@/utils/timelog/gridState";
import {
  teamTimelogDaysFromWeekSnapshot,
  type TeamTimelogDayRow,
  type TeamTimelogEntryLine,
} from "@/utils/timelog/teamWeekTable";
import { compareSortValues, type SortDirection } from "@/utils/listSort";
import { formatHoursDisplay } from "@/utils/timelog/weekDates";

type TeamTimelogTableProps = {
  snapshot: TimelogWeekSnapshot | null;
  dayDates: Date[];
  dayKeys: string[];
};

const DETAIL_COLUMNS: Array<{ key: keyof TeamTimelogEntryLine; label: string }> = [
  { key: "project", label: "Project" },
  { key: "task_category", label: "Task category" },
  { key: "sub_category", label: "Sub category" },
  { key: "hours", label: "Hours" },
  { key: "comment", label: "Description" },
];

function StackedCell({ lines, field }: { lines: TeamTimelogEntryLine[]; field: keyof TeamTimelogEntryLine }) {
  if (lines.length === 1) {
    const value = lines[0][field];
    return <span>{field === "hours" ? value : String(value)}</span>;
  }

  return (
    <div>
      {lines.map((line, idx) => (
        <div
          key={idx}
          className={`py-1.5 first:pt-0 last:pb-0 ${
            idx > 0 ? "border-t border-wt-border/50" : ""
          }`}
        >
          {field === "hours" ? line.hours : String(line[field])}
        </div>
      ))}
    </div>
  );
}

export function TeamTimelogTable({ snapshot, dayDates, dayKeys }: TeamTimelogTableProps) {
  const [dateSort, setDateSort] = useState<SortDirection>("asc");
  const dayRows = useMemo(
    () => teamTimelogDaysFromWeekSnapshot(snapshot, dayKeys, dayDates),
    [snapshot, dayKeys, dayDates]
  );
  const sortedDays = useMemo(() => {
    const sorted = [...dayRows];
    sorted.sort((a, b) => compareSortValues(a.log_date, b.log_date, "date", dateSort));
    return sorted;
  }, [dayRows, dateSort]);
  const weeklyTotal = snapshot?.weekly_total ?? 0;

  if (!sortedDays.length) {
    return (
      <p className="rounded-xl border border-dashed border-wt-border bg-wt-surface-2/40 px-6 py-10 text-center text-sm text-wt-text-muted">
        No timelog entries for this week.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ScrollableTable maxHeightClass="max-h-[min(65vh,560px)]">
        <WtTable>
          <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="inline-flex h-auto items-center gap-1 p-0 hover:text-wt-text"
                  onClick={() => setDateSort((prev) => (prev === "asc" ? "desc" : "asc"))}
                >
                  Date
                  <span className="text-[10px] not-italic" aria-hidden>
                    {dateSort === "asc" ? "↑" : "↓"}
                  </span>
                </Button>
              </TableHead>
              {DETAIL_COLUMNS.map((col) => (
                <TableHead key={col.key}>
                  {col.label}
                </TableHead>
              ))}
              <TableHead>Day total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDays.map((day: TeamTimelogDayRow, idx) => (
              <TableRow
                key={day.log_date}
                className={idx > 0 ? "border-t-2" : ""}
              >
                <TableCell className="align-top">{day.log_date_label}</TableCell>
                {DETAIL_COLUMNS.map((col) => (
                  <TableCell key={col.key} className="align-top min-w-[7rem]">
                    <StackedCell lines={day.entries} field={col.key} />
                  </TableCell>
                ))}
                <TableCell className="align-top tabular-nums">
                  {formatHoursDisplay(day.total_hours)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </WtTable>
      </ScrollableTable>

      <div className="rounded-xl border border-wt-border bg-wt-surface-2/60 px-4 py-3 text-right text-sm">
        <span className="text-wt-text-muted">Week total:</span>{" "}
        <span className="font-semibold tabular-nums">{formatHoursDisplay(weeklyTotal)}</span>
      </div>
    </div>
  );
}
