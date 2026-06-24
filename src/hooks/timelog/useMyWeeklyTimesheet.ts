"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { ApiError } from "@/api/error";
import {
  gridRowsFromWeekSnapshot,
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
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimelogGridRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
    staleTime: 0,
    queryFn: async () => {
      const res = await hrmsService.getTimelogWeek({ weekStart: activeWeekKey });
      return ((res as { data?: TimelogWeekSnapshot }).data ?? res) as TimelogWeekSnapshot;
    },
  });

  const rows = useMemo(
    () => (weekQuery.data ? gridRowsFromWeekSnapshot(weekQuery.data, dayKeys) : []),
    [weekQuery.data, dayKeys]
  );

  const projectOptions = useMemo(
    () => projectOptionsFromPayload(optionsQuery.data ?? null),
    [optionsQuery.data]
  );

  const load = useCallback(() => {
    setActionError(null);
    const key = formatApiDate(normalizeWeekStart(weekStart));
    setActiveWeekKey(key);
    void weekQuery.refetch();
  }, [weekStart, weekQuery]);

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

  const openAddSheet = useCallback(() => {
    setEditingEntry(null);
    setSheetOpen(true);
  }, []);

  const editEntry = useCallback((row: TimelogGridRow) => {
    setEditingEntry(row);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingEntry(null);
  }, []);

  const saveEntry = useCallback(async (row: TimelogGridRow) => {
    const weekStartKey = formatApiDate(normalizeWeekStart(weekStart));
    await runAction(async () => {
      const payloadRows = weekPayloadFromGridRows([row], dayKeys);
      if (!payloadRows.length) throw new Error("Add at least one hour before saving.");
      await hrmsService.saveTimelogWeek({
        week_start: weekStartKey,
        rows: payloadRows,
      });
      await weekQuery.refetch();
      closeSheet();
    });
  }, [weekStart, dayKeys, weekQuery, runAction, closeSheet]);

  const submitEntry = useCallback(async (row: TimelogGridRow) => {
    const weekStartKey = formatApiDate(normalizeWeekStart(weekStart));
    await runAction(async () => {
      const payloadRows = weekPayloadFromGridRows([row], dayKeys);
      if (payloadRows.length) {
        await hrmsService.saveTimelogWeek({ week_start: weekStartKey, rows: payloadRows });
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
      closeSheet();
    });
  }, [weekStart, dayKeys, weekQuery, runAction, closeSheet]);

  return {
    weekStart,
    setWeekStart,
    dayDates,
    dayKeys,
    rows,
    projectOptions,
    loading: weekQuery.isFetching && !weekQuery.isPaused,
    error: weekQuery.error ? (weekQuery.error instanceof Error ? weekQuery.error.message : "Unable to load timelog week") : actionError,
    actionLoading,
    load,
    editingEntry,
    sheetOpen,
    openAddSheet,
    editEntry,
    closeSheet,
    saveEntry,
    submitEntry,
  };
}
