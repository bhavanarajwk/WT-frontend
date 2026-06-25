"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    editingEntry,
    sheetOpen,
    openAddSheet,
    editEntry,
    closeSheet,
    saveEntry,
    submitEntry,
  } = useMyWeeklyTimesheet();

  return (
    <Card>
      <CardHeader>
        <CardTitle>My weekly timesheet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <WeekPickerField weekStart={weekStart} onWeekStartChange={setWeekStart} disabled={loading || actionLoading} />

        <p className="text-xs text-wt-text-muted">
          <span className="font-medium text-wt-text">Add entry</span> opens a panel to log hours.{" "}
          Click a row to edit.
        </p>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <Button
          variant="brand"
          size="sm"
          type="button"
          disabled={loading || actionLoading}
          onClick={openAddSheet}
        >
          Add entry
        </Button>

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
      </CardContent>
    </Card>
  );
}
