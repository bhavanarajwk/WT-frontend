"use client";

import { WeekPickerField } from "@/components/dashboard/timelog/WeekPickerField";
import { WeeklyTimelogGrid } from "@/components/dashboard/timelog/WeeklyTimelogGrid";
import { TimelogEntrySheet } from "@/components/dashboard/timelog/TimelogEntrySheet";
import { useMyWeeklyTimesheet } from "@/hooks/timelog/useMyWeeklyTimesheet";

export function MyWeeklyTimesheet() {
  const {
    weekStart,
    setWeekStart,
    dayDates,
    dayKeys,
    rows,
    projectOptions,
    loading,
    error,
    actionLoading,
    load,
    editingEntry,
    sheetOpen,
    openAddSheet,
    editEntry,
    closeSheet,
    saveEntry,
    submitEntry,
  } = useMyWeeklyTimesheet();

  return (
    <section className="rounded-xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">My weekly timesheet</h2>
        <div className="flex flex-wrap items-center gap-2">
          <WeekPickerField weekStart={weekStart} onWeekStartChange={setWeekStart} disabled={loading || actionLoading} />
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-sm border border-wt-border rounded-lg"
            disabled={loading || actionLoading}
            onClick={load}
          >
            {loading ? "Loading\u2026" : "Load"}
          </button>
        </div>
      </div>

      <p className="text-xs text-wt-text-muted">
        <span className="font-medium text-wt-text">Load</span> fetches your entries.{" "}
        <span className="font-medium text-wt-text">Add entry</span> opens a panel to log hours.{" "}
        Click a row to edit.
      </p>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-primary px-4 py-2 text-sm"
          disabled={loading || actionLoading}
          onClick={openAddSheet}
        >
          Add entry
        </button>
      </div>

      {!loading && !rows.length ? (
        <p className="py-8 text-center text-sm text-wt-text-muted">
          No entries for this week. Click <span className="font-medium text-wt-text">Add entry</span> to log hours.
        </p>
      ) : (
        <WeeklyTimelogGrid
          rows={rows}
          dayDates={dayDates}
          dayKeys={dayKeys}
          projectOptions={projectOptions}
          readOnly
          onRowClick={editEntry}
          onRowsChange={() => {}}
        />
      )}

      <TimelogEntrySheet
        open={sheetOpen}
        entry={editingEntry}
        dayDates={dayDates}
        dayKeys={dayKeys}
        projectOptions={projectOptions}
        actionLoading={actionLoading}
        onSave={saveEntry}
        onSubmit={submitEntry}
        onClose={closeSheet}
      />
    </section>
  );
}
