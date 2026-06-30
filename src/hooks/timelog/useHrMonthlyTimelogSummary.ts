"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import {
  currentMonthRef,
  shiftMonth,
  formatMonthYearLabel,
  weekStartsInMonth,
  type MonthRef,
} from "@/utils/timelog/monthWeeks";
import type {
  HrTimelogEmployee,
  HrMonthlyTimelogRow,
} from "./useHrMonthlyTimelogSummary.types";

type BatchTotalsPayload = Record<string, Record<string, number>>;

function unwrapBatchTotals(response: unknown): BatchTotalsPayload {
  return ((response as { data?: BatchTotalsPayload }).data ?? response) as BatchTotalsPayload;
}

export function useHrMonthlyTimelogSummary(
  employees: HrTimelogEmployee[],
  month: MonthRef,
  enabled: boolean
) {
  const weekStarts = useMemo(() => weekStartsInMonth(month), [month]);

  const queryKey = useMemo(
    () => [
      "hr-monthly-timelog-summary",
      month.year,
      month.month,
      ...employees.map((e) => e.email).sort(),
    ],
    [month.year, month.month, employees]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      if (!employees.length) {
        return { rows: [] as HrMonthlyTimelogRow[], weekStarts };
      }

      const response = await hrmsService.getTimelogWeekTotalsBatch({
        weekStarts,
        employeeEmails: employees.map((e) => e.email),
      });

      const totals = unwrapBatchTotals(response);

      const rows: HrMonthlyTimelogRow[] = employees.map((emp) => ({
        email: emp.email,
        label: emp.label,
        hoursByWeek: totals[emp.email] ?? Object.fromEntries(weekStarts.map((w) => [w, 0])),
      }));

      return { rows, weekStarts };
    },
  });

  return {
    rows: data?.rows ?? [],
    weekStarts,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Unable to load monthly timelog summary") : null,
    reload: () => void refetch(),
  };
}

export { currentMonthRef, shiftMonth, formatMonthYearLabel };
export type { HrTimelogEmployee, HrMonthlyTimelogRow, MonthRef };
