"use client";

import { useCallback, useEffect, useState } from "react";
import { hrmsService } from "@/services/hrms.service";
import type { TimelogWeekSnapshot } from "@/utils/timelog/gridState";
import {
  currentMonthRef,
  type MonthRef,
  weekStartsInMonth,
} from "@/utils/timelog/monthWeeks";

export type HrTimelogEmployee = {
  email: string;
  label: string;
};

export type HrMonthlyTimelogRow = {
  email: string;
  label: string;
  hoursByWeek: Record<string, number>;
};

function unwrapWeek(response: unknown): TimelogWeekSnapshot {
  return ((response as { data?: TimelogWeekSnapshot }).data ?? response) as TimelogWeekSnapshot;
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

export function useHrMonthlyTimelogSummary(
  employees: HrTimelogEmployee[],
  month: MonthRef,
  enabled: boolean
) {
  const [rows, setRows] = useState<HrMonthlyTimelogRow[]>([]);
  const [weekStarts, setWeekStarts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !employees.length) {
      setRows([]);
      setWeekStarts(weekStartsInMonth(month));
      return;
    }

    const weeks = weekStartsInMonth(month);
    setWeekStarts(weeks);
    setLoading(true);
    setError(null);

    try {
      const hoursMap = new Map<string, Record<string, number>>();
      for (const emp of employees) {
        hoursMap.set(emp.email, Object.fromEntries(weeks.map((w) => [w, 0])));
      }

      const tasks = employees.flatMap((emp) =>
        weeks.map((weekStart) => async () => {
          const res = await hrmsService.getTimelogWeek({
            weekStart,
            employeeEmail: emp.email,
          });
          const snapshot = unwrapWeek(res);
          const bucket = hoursMap.get(emp.email);
          if (bucket) {
            bucket[weekStart] = snapshot.weekly_total ?? 0;
          }
        })
      );

      await runWithConcurrency(tasks, 12);

      setRows(
        employees.map((emp) => ({
          email: emp.email,
          label: emp.label,
          hoursByWeek: hoursMap.get(emp.email) ?? {},
        }))
      );
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Unable to load monthly timelog summary");
    } finally {
      setLoading(false);
    }
  }, [employees, enabled, month]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, weekStarts, loading, error, reload: load };
}

export { currentMonthRef, shiftMonth, formatMonthYearLabel } from "@/utils/timelog/monthWeeks";
