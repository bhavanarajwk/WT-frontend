"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimelogCalendar } from "@/components/dashboard/timelog/TimelogCalendar/TimelogCalendar";
import { DayEntriesPanel } from "@/components/dashboard/timelog/DayEntriesPanel/DayEntriesPanel";
import { DayEntryForm } from "@/components/dashboard/timelog/DayEntryForm/DayEntryForm";
import { TimelogTable } from "@/components/dashboard/timelog/TimelogTable/TimelogTable";
import { useDayTimelog } from "@/hooks/timelog/useDayTimelog";
import { useAuth } from "@/context/AuthContext";

export function MyWeeklyTimesheet() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"calendar" | "table">("table");

  const {
    calendar,
    selectedDate,
    selectedDayEntries,
    selectedDateTotal,
    projectOptions,
    loading,
    error,
    actionLoading,
    editingEntry,
    showEntryForm,
    viewYear,
    viewMonth,
    navigateMonth,
    goToToday,
    goToMonth,
    selectDate,
    addEntry,
    saveAndSubmitEntry,
    updateEntry,
    deleteEntry,
    submitDay,
    openAddForm,
    openEditForm,
    closeForm,
    closePanel,
    tableEntries,
    tableTotal,
    tablePage,
    tablePageSize,
    tableLoading,
    onTablePageChange,
    reload,
  } = useDayTimelog();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>My Time Logs</CardTitle>
        <Button variant="outline" size="sm" type="button" disabled={loading} onClick={() => reload()}>
          {loading ? "Loading\u2026" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "calendar" | "table")}
        >
          <TabsList aria-label="View mode" className="gap-3 bg-transparent p-0">
            <TabsTrigger value="table">All entries</TabsTrigger>
            <TabsTrigger value="calendar">Add Time Logs</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === "calendar" ? (
          <>
            <TimelogCalendar
              calendar={calendar}
              selectedDate={selectedDate}
              loading={loading}
              viewYear={viewYear}
              viewMonth={viewMonth}
              doj={user?.doj}
              onSelectDate={selectDate}
              onNavigate={navigateMonth}
              onGoToToday={goToToday}
              onGoToMonth={goToMonth}
            />

            {showEntryForm ? (
              <DayEntryForm
                key={editingEntry?.id ?? "new"}
                entry={editingEntry}
                projectOptions={projectOptions}
                actionLoading={actionLoading}
                dayTotalHours={selectedDateTotal}
                selectedDate={selectedDate ?? ""}
                onSave={addEntry}
                onSaveAndSubmit={saveAndSubmitEntry}
                onUpdate={updateEntry}
                onCancel={closeForm}
              />
            ) : selectedDate ? (
              <DayEntriesPanel
                selectedDate={selectedDate}
                entries={selectedDayEntries}
                totalHours={selectedDateTotal}
                loading={loading}
                actionLoading={actionLoading}
                error={error}
                onAdd={openAddForm}
                onEdit={openEditForm}
                onDelete={deleteEntry}
                onSubmit={submitDay}
                onClose={closePanel}
              />
            ) : null}
          </>
        ) : (
          <TimelogTable
            entries={tableEntries}
            total={tableTotal}
            page={tablePage}
            size={tablePageSize}
            loading={tableLoading}
            onPageChange={onTablePageChange}
          />
        )}
      </CardContent>
    </Card>
  );
}
