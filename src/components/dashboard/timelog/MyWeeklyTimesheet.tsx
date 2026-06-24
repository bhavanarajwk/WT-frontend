"use client";

import { WeekPickerField } from "@/components/dashboard/timelog/WeekPickerField";
import { WeeklyTimelogGrid } from "@/components/dashboard/timelog/WeeklyTimelogGrid";
import { useMyWeeklyTimesheet } from "@/hooks/timelog/useMyWeeklyTimesheet";

export function MyWeeklyTimesheet() {
  const {
    weekStart,
    setWeekStart,
    dayDates,
    dayKeys,
    rows,
    setRows,
    projectOptions,
    loading,
    error,
    actionLoading,
    load,
    save,
    submit,
  } = useMyWeeklyTimesheet();

  const isBusy = loading || actionLoading;

  return (
    <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">My weekly timesheet</h2>
        <div className="flex flex-wrap items-center gap-2">
          <WeekPickerField weekStart={weekStart} onWeekStartChange={setWeekStart} disabled={isBusy} />
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm"
            disabled={isBusy}
            onClick={load}
          >
            {loading ? "Loading\u2026" : "Load"}
          </button>
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-sm border border-wt-border rounded-lg"
            disabled={isBusy}
            onClick={() => load()}
          >
            Refresh
          </button>
        </div>
      </div>

      <p className="text-xs text-wt-text-muted">
        <span className="font-medium text-wt-text">Load</span> fetches timelog entries for the selected week.{" "}
        <span className="font-medium text-wt-text">Save Draft</span> keeps entries visible only to you.{" "}
        <span className="font-medium text-wt-text">Submit for Approval</span> sends draft and rejected entries to your
        manager for approval.
      </p>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <WeeklyTimelogGrid
        rows={rows}
        dayDates={dayDates}
        dayKeys={dayKeys}
        projectOptions={projectOptions}
        onRowsChange={setRows}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-ghost px-4 py-2 text-sm border border-wt-border rounded-lg"
          disabled={isBusy}
          onClick={() => void save()}
        >
          {actionLoading ? "Saving\u2026" : "Save Draft"}
        </button>
        <button
          type="button"
          className="btn-primary px-4 py-2 text-sm"
          disabled={isBusy}
          onClick={() => void submit()}
        >
          {actionLoading ? "Submitting\u2026" : "Submit for Approval"}
        </button>
      </div>
    </section>
  );
}
