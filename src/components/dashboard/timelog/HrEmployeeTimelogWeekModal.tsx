"use client";

import { Button } from "@/components/ui/button";
import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SelectField } from "@/components/dashboard/ui/forms";
import { WeeklyTimelogGrid } from "@/components/dashboard/timelog/WeeklyTimelogGrid";
import { hrmsService } from "@/services/hrms.service";
import { projectOptionsFromPayload, type TimelogOptionsPayload } from "@/utils/timelog/categories";
import { gridRowsFromWeekSnapshot, type TimelogWeekSnapshot } from "@/utils/timelog/gridState";
import { weekColumnLabel } from "@/utils/timelog/monthWeeks";
import {
  formatApiDate,
  normalizeWeekStart,
  parseTimelogDate,
  weekDaysMonSun,
  weekRangeLabel,
} from "@/utils/timelog/weekDates";

type HrEmployeeTimelogWeekModalProps = {
  open: boolean;
  employeeEmail: string;
  employeeLabel: string;
  weekStart: string;
  weekStarts: string[];
  onWeekStartChange: (weekStart: string) => void;
  onClose: () => void;
};

function unwrapPayload<T>(response: unknown): T {
  return ((response as { data?: T }).data ?? response) as T;
}

export function HrEmployeeTimelogWeekModal({
  open,
  employeeEmail,
  employeeLabel,
  weekStart,
  weekStarts,
  onWeekStartChange,
  onClose,
}: HrEmployeeTimelogWeekModalProps) {
  const [options, setOptions] = useState<TimelogOptionsPayload | null>(null);
  const [snapshot, setSnapshot] = useState<TimelogWeekSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekDate = useMemo(() => {
    const parsed = parseTimelogDate(weekStart);
    return parsed ? normalizeWeekStart(parsed) : normalizeWeekStart(new Date());
  }, [weekStart]);

  const dayDates = useMemo(() => weekDaysMonSun(weekDate), [weekDate]);
  const dayKeys = useMemo(() => dayDates.map(formatApiDate), [dayDates]);
  const projectOptions = useMemo(() => projectOptionsFromPayload(options), [options]);
  const gridRows = useMemo(
    () => (snapshot?.rows?.length ? gridRowsFromWeekSnapshot(snapshot, dayKeys) : []),
    [snapshot, dayKeys]
  );

  const weekOptions = useMemo(
    () =>
      weekStarts.map((start, index) => {
        const parsed = parseTimelogDate(start);
        const label = parsed
          ? `${weekColumnLabel(index)} (${weekRangeLabel(normalizeWeekStart(parsed))})`
          : weekColumnLabel(index);
        return { value: start, label };
      }),
    [weekStarts]
  );

  const loadWeek = useCallback(async () => {
    if (!open || !employeeEmail.trim() || !weekStart) return;
    setLoading(true);
    setError(null);
    try {
      const [optionsRes, weekRes] = await Promise.all([
        hrmsService.getTimelogOptions(),
        hrmsService.getTimelogWeek({
          weekStart,
          employeeEmail: employeeEmail.trim().toLowerCase(),
        }),
      ]);
      setOptions(unwrapPayload<TimelogOptionsPayload>(optionsRes));
      setSnapshot(unwrapPayload<TimelogWeekSnapshot>(weekRes));
    } catch (err) {
      setSnapshot(null);
      setError(err instanceof Error ? err.message : "Unable to load time log details");
    } finally {
      setLoading(false);
    }
  }, [open, employeeEmail, weekStart]);

  useEffect(() => {
    if (!open) return;
    void loadWeek();
  }, [open, loadWeek]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hr-timelog-week-title"
        className="flex max-h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-wt-border bg-wt-surface-1 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-wt-border px-5 py-4 md:px-6">
          <div>
            <h2 id="hr-timelog-week-title" className="text-lg font-semibold">
              {employeeLabel}
            </h2>
            <p className="mt-1 text-xs text-wt-text-muted">Approved time log details (read-only)</p>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-end gap-3">
            <SelectField
              label="Week"
              className="min-w-[min(100%,320px)]"
              value={weekStart}
              onChange={onWeekStartChange}
              options={weekOptions}
            />
            <Button variant="outline" size="sm" type="button" disabled={loading} onClick={() => void loadWeek()}>
              {loading ? "Loading\u2026" : "Refresh"}
            </Button>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          {loading ? (
            <SectionLoading className="py-10" label="Loading time log details…" />
          ) : !gridRows.length ? (
            <p className="py-10 text-center text-sm text-wt-text-muted">
              No approved time log entries for this week.
            </p>
          ) : (
            <WeeklyTimelogGrid
              rows={gridRows}
              dayDates={dayDates}
              dayKeys={dayKeys}
              projectOptions={projectOptions}
              readOnly
              onRowsChange={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}
