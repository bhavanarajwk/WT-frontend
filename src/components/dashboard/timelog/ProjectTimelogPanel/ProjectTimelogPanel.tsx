"use client";

import { useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WtLoader, WtLoaderCentered } from "@/components/dashboard/ui/WtLoader";
import { WeekPickerField } from "@/components/dashboard/timelog/WeekPickerField";
import { ProjectTimelogCardList } from "@/components/dashboard/timelog/ProjectTimelogCardList/ProjectTimelogCardList";
import { EmployeeWeekDetail } from "@/components/dashboard/timelog/EmployeeWeekDetail/EmployeeWeekDetail";
import { useProjectTimelogs } from "@/hooks/timelog/useProjectTimelogs";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { hrmsService } from "@/services/hrms.service";
import { formatApiDate, weekDaysMonSun } from "@/utils/timelog/weekDates";
import { gridRowsFromWeekSnapshot, type TimelogGridRow } from "@/utils/timelog/gridState";
import type { ProjectTimelogPanelProps } from "./ProjectTimelogPanel.types";

export function ProjectTimelogPanel({ enabled }: ProjectTimelogPanelProps) {
  const queryClient = useQueryClient();
  const {
    projects,
    projectsLoading,
    weekTotals,
    weekTotalsLoading,
    expandedProject,
    selectedEmployee,
    weekStart,
    employeeWeekData,
    employeeWeekLoading,
    setWeekStart,
    toggleProject,
    selectEmployee,
  } = useProjectTimelogs(enabled);

  const { runAction } = useDashboardAction();
  const [actionLoading, setActionLoading] = useState(false);

  const dayDates = useMemo(() => weekDaysMonSun(weekStart), [weekStart]);
  const dayKeys = useMemo(() => dayDates.map(formatApiDate), [dayDates]);
  const weekStartStr = useMemo(() => formatApiDate(weekStart), [weekStart]);

  const employeeGridRows: TimelogGridRow[] = useMemo(() => {
    if (!employeeWeekData?.rows?.length || !expandedProject) return [];
    const filtered = {
      ...employeeWeekData,
      rows: employeeWeekData.rows.filter(
        (r) => r.project_code.toUpperCase() === expandedProject.toUpperCase()
      ),
    };
    return gridRowsFromWeekSnapshot(filtered, dayKeys);
  }, [employeeWeekData, dayKeys, expandedProject]);

  const handleStatusChange = useCallback(
    async (row: TimelogGridRow, status: "APPROVED" | "REJECTED", remark: string) => {
      if (!selectedEmployee) return;
      setActionLoading(true);
      await runAction(status === "APPROVED" ? "Approve timelog" : "Reject timelog", async () => {
        const email = selectedEmployee.trim().toLowerCase();
        const submittedDays = dayKeys.filter(
          (key) => {
            const s = row.status_by_date?.[key];
            return (s === "SUBMITTED" || s === "REJECTED") && row.hours_by_date[key];
          }
        );
        await Promise.all(
          submittedDays.map((key) =>
            hrmsService.updateTimelogStatusBatch({
              employee_email: email,
              project_code: row.project_code.trim().toUpperCase(),
              log_date: key,
              status,
              manager_comment: remark || undefined,
            })
          )
        );
      });
      setActionLoading(false);
      queryClient.invalidateQueries({
        queryKey: ["project-timelogs-employee-week", selectedEmployee, weekStartStr],
      });
    },
    [selectedEmployee, dayKeys, weekStartStr, runAction, queryClient]
  );

  const handleApprove = useCallback(
    (row: TimelogGridRow, remark: string) => handleStatusChange(row, "APPROVED", remark),
    [handleStatusChange]
  );

  const handleReject = useCallback(
    (row: TimelogGridRow, remark: string) => handleStatusChange(row, "REJECTED", remark),
    [handleStatusChange]
  );

  if (selectedEmployee && employeeWeekData) {
    return (
      <EmployeeWeekDetail
        employeeEmail={selectedEmployee}
        weekStart={weekStart}
        dayKeys={dayKeys}
        dayDates={dayDates}
        gridRows={employeeGridRows}
        loading={employeeWeekLoading}
        actionLoading={actionLoading}
        onBack={() => selectEmployee(null)}
        onWeekChange={setWeekStart}
        onRefresh={() => {
          queryClient.invalidateQueries({
            queryKey: ["project-timelogs-employee-week", selectedEmployee, weekStartStr],
          });
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    );
  }

  if (projectsLoading) {
    return (
      <Card><CardContent className="flex items-center justify-center p-4"><WtLoaderCentered label="" /></CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Project timelogs</CardTitle>
        <div className="flex items-center gap-2">
          <WeekPickerField weekStart={weekStart} onWeekStartChange={setWeekStart} />
          <Button variant="outline" size="sm" type="button" disabled={projectsLoading} onClick={() => queryClient.invalidateQueries({ queryKey: ["project-timelogs-projects"] })}>
            {projectsLoading ? <WtLoader size="sm" /> : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProjectTimelogCardList
          projects={projects}
          weekTotals={weekTotals}
          weekTotalsLoading={weekTotalsLoading}
          expandedProject={expandedProject}
          selectedEmployee={selectedEmployee}
          onToggleProject={toggleProject}
          onSelectEmployee={selectEmployee}
        />
      </CardContent>
    </Card>
  );
}
