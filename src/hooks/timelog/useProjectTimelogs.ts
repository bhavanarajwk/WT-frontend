"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { hrmsService } from "@/services/hrms.service";
import { formatApiDate, normalizeWeekStart } from "@/utils/timelog/weekDates";
import type {
  ProjectTimelogsData,
  ProjectTimelogProject,
  ProjectWeekEmployeeTotal,
  ProjectWeekTotalsData,
} from "./useProjectTimelogs.types";
import type { TimelogWeekSnapshot } from "@/utils/timelog/gridState";

function unwrapData<T>(response: unknown): T {
  return ((response as { data?: T }).data ?? response) as T;
}

export function useProjectTimelogs(enabled: boolean) {
  const [weekStart, setWeekStart] = useState(() => normalizeWeekStart(new Date()));
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const weekStartStr = useMemo(() => formatApiDate(weekStart), [weekStart]);

  const projectsQuery = useQuery({
    queryKey: ["project-timelogs-projects"],
    enabled,
    queryFn: async () => {
      const response = await hrmsService.getTimelogProjects();
      return unwrapData<ProjectTimelogsData>(response);
    },
  });

  const projects: ProjectTimelogProject[] = useMemo(
    () => projectsQuery.data?.projects ?? [],
    [projectsQuery.data]
  );

  const weekTotalsQuery = useQuery({
    queryKey: ["project-timelogs-week-totals", expandedProject, weekStartStr],
    enabled: enabled && !!expandedProject,
    queryFn: async () => {
      const response = await hrmsService.getTimelogProjectWeekTotals(expandedProject!, weekStartStr);
      return unwrapData<ProjectWeekTotalsData>(response);
    },
  });

  const weekTotals: Record<string, ProjectWeekEmployeeTotal[]> = useMemo(() => {
    if (!weekTotalsQuery.data) return {};
    return { [weekTotalsQuery.data.project_code]: weekTotalsQuery.data.employees };
  }, [weekTotalsQuery.data]);

  const employeeWeekQuery = useQuery({
    queryKey: ["project-timelogs-employee-week", selectedEmployee, weekStartStr],
    enabled: enabled && !!selectedEmployee,
    queryFn: async () => {
      const response = await hrmsService.getTimelogWeek({
        weekStart: weekStartStr,
        employeeEmail: selectedEmployee!,
      });
      return unwrapData<TimelogWeekSnapshot>(response);
    },
  });

  const employeeWeekData: TimelogWeekSnapshot | null = useMemo(
    () => employeeWeekQuery.data ?? null,
    [employeeWeekQuery.data]
  );

  const toggleProject = useCallback((code: string) => {
    setExpandedProject((prev) => (prev === code ? null : code));
    setSelectedEmployee(null);
  }, []);

  const selectEmployee = useCallback((email: string | null) => {
    setSelectedEmployee(email);
  }, []);

  return {
    projects,
    projectsLoading: projectsQuery.isLoading,
    projectsError: projectsQuery.error
      ? projectsQuery.error instanceof Error
        ? projectsQuery.error.message
        : "Failed to load projects"
      : null,
    weekTotals,
    weekTotalsLoading: weekTotalsQuery.isLoading,
    expandedProject,
    selectedEmployee,
    weekStart,
    employeeWeekData,
    employeeWeekLoading: employeeWeekQuery.isFetching,
    setWeekStart: useCallback((ws: Date) => {
      setWeekStart(ws);
      setSelectedEmployee(null);
    }, []),
    toggleProject,
    selectEmployee,
    reload: useCallback(() => {
      void projectsQuery.refetch();
    }, [projectsQuery]),
  };
}
