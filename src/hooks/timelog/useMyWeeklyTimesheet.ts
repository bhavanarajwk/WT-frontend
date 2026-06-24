"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { ApiError } from "@/api/error";
import {
  gridRowsFromWeekSnapshot,
  hasSubmittableEntries,
  type TimelogGridRow,
  type TimelogWeekSnapshot,
  weekPayloadFromGridRows,
} from "@/utils/timelog/gridState";
import {
  formatApiDate,
  normalizeWeekStart,
  weekDaysMonSun,
} from "@/utils/timelog/weekDates";
import {
  projectOptionsFromPayload,
  type TimelogOptionsPayload,
} from "@/utils/timelog/categories";

export function useMyWeeklyTimesheet() {
  const [weekStart, setWeekStart] = useState(() => normalizeWeekStart(new Date()));
  const [activeWeekKey, setActiveWeekKey] = useState(() => formatApiDate(normalizeWeekStart(new Date())));
  const [rows, setRows] = useState<TimelogGridRow[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const dayDates = useMemo(() => weekDaysMonSun(weekStart), [weekStart]);
  const dayKeys = useMemo(() => dayDates.map(formatApiDate), [dayDates]);

  const optionsQuery = useQuery({
    queryKey: ["timelog-options"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await hrmsService.getTimelogOptions();
      return ((res as { data?: TimelogOptionsPayload }).data ?? res) as TimelogOptionsPayload;
    },
  });

  const weekQuery = useQuery({
    queryKey: ["my-timelog-week", activeWeekKey],
    queryFn: async () => {
      const res = await hrmsService.getTimelogWeek({ weekStart: activeWeekKey });
      const snapshot = ((res as { data?: TimelogWeekSnapshot }).data ?? res) as TimelogWeekSnapshot;
      setRows(gridRowsFromWeekSnapshot(snapshot, dayKeys));
      return snapshot;
    },
  });

  const projectOptions = useMemo(
    () => projectOptionsFromPayload(optionsQuery.data ?? null),
    [optionsQuery.data]
  );

  const load = useCallback(() => {
    setActionError(null);
    const key = formatApiDate(normalizeWeekStart(weekStart));
    setActiveWeekKey(key);
  }, [weekStart]);

  const runAction = useCallback(async (fn: () => Promise<unknown>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await fn();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "An error occurred";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const save = useCallback(async () => {
    const payloadRows = weekPayloadFromGridRows(rows, dayKeys);
    if (!payloadRows.length) throw new Error("Add at least one draft entry before saving.");
    await runAction(async () => {
      await hrmsService.saveTimelogWeek({
        week_start: formatApiDate(normalizeWeekStart(weekStart)),
        rows: payloadRows,
      });
      await weekQuery.refetch();
    });
  }, [rows, dayKeys, weekStart, weekQuery, runAction]);

  const submit = useCallback(async () => {
    const weekStartKey = formatApiDate(normalizeWeekStart(weekStart));
    await runAction(async () => {
      const payloadRows = weekPayloadFromGridRows(rows, dayKeys);
      if (payloadRows.length) {
        await hrmsService.saveTimelogWeek({ week_start: weekStartKey, rows: payloadRows });
      } else if (!hasSubmittableEntries(rows, dayKeys)) {
        throw new Error("Save draft hours before submitting to your manager.");
      }
      try {
        await hrmsService.submitTimelogWeek({ week_start: weekStartKey });
      } catch (error) {
        if (error instanceof ApiError && error.message.includes("NO_DRAFT_ENTRIES")) {
          throw new Error("Nothing to submit. Save draft hours first.");
        }
        throw error;
      }
      await weekQuery.refetch();
    });
  }, [rows, dayKeys, weekStart, weekQuery, runAction]);

  return {
    weekStart,
    setWeekStart,
    dayDates,
    dayKeys,
    rows,
    setRows,
    projectOptions,
    loading: weekQuery.isLoading || weekQuery.isRefetching,
    error: weekQuery.error ? (weekQuery.error instanceof Error ? weekQuery.error.message : "Unable to load timelog week") : actionError,
    actionLoading,
    load,
    save,
    submit,
  };
}
