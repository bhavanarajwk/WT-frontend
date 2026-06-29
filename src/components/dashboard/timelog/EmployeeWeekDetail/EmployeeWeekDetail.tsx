"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WtLoader, WtLoaderCentered } from "@/components/dashboard/ui/WtLoader";
import { WeeklyTimelogGrid } from "@/components/dashboard/timelog/WeeklyTimelogGrid";
import { WeekPickerField } from "@/components/dashboard/timelog/WeekPickerField";
import { EntryReviewSidePanel } from "@/components/dashboard/timelog/EntryReviewSidePanel/EntryReviewSidePanel";
import { useState, useCallback } from "react";
import "./EmployeeWeekDetail.css";
import type { EmployeeWeekDetailProps } from "./EmployeeWeekDetail.types";
import type { TimelogGridRow } from "@/utils/timelog/gridState";

export function EmployeeWeekDetail({
  employeeEmail,
  weekStart,
  dayKeys,
  dayDates,
  gridRows,
  loading,
  actionLoading,
  onBack,
  onWeekChange,
  onRefresh,
  onApprove,
  onReject,
}: EmployeeWeekDetailProps) {
  const [selectedRow, setSelectedRow] = useState<TimelogGridRow | null>(null);

  const handleRowClick = useCallback((row: TimelogGridRow) => {
    setSelectedRow(row);
  }, []);

  const handleApprove = useCallback(
    async (remark: string) => {
      if (!selectedRow) return;
      await onApprove(selectedRow, remark);
      setSelectedRow(null);
    },
    [selectedRow, onApprove]
  );

  const handleReject = useCallback(
    async (remark: string) => {
      if (!selectedRow) return;
      await onReject(selectedRow, remark);
      setSelectedRow(null);
    },
    [selectedRow, onReject]
  );

  return (
    <>
      <Card>
        <CardContent className="p-5 employee-week-detail">
          <div className="detail-header">
            <div className="detail-title">
              <button className="back-btn" type="button" onClick={onBack}>
                ← Back
              </button>
              <span>{employeeEmail}</span>
            </div>
            <div className="detail-actions">
              <WeekPickerField weekStart={weekStart} onWeekStartChange={onWeekChange} />
              <Button variant="outline" size="sm" type="button" disabled={loading} onClick={onRefresh}>
                {loading ? <WtLoader size="sm" /> : "Refresh"}
              </Button>
            </div>
          </div>
          {loading ? (
            <WtLoaderCentered label="" />
          ) : gridRows.length === 0 ? (
            <p className="loading-state">No timelog entries for this week.</p>
          ) : (
            <WeeklyTimelogGrid
              rows={gridRows}
              dayDates={dayDates}
              dayKeys={dayKeys}
              projectOptions={[]}
              readOnly
              onRowClick={handleRowClick}
              onRowsChange={() => {}}
            />
          )}
        </CardContent>
      </Card>
      {selectedRow ? (
        <EntryReviewSidePanel
          row={selectedRow}
          dayKeys={dayKeys}
          dayDates={dayDates}
          employeeEmail={employeeEmail}
          actionLoading={actionLoading}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelectedRow(null)}
        />
      ) : null}
    </>
  );
}
