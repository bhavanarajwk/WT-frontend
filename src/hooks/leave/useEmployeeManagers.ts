"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService, type LeaveManagerOption } from "@/services/hrms.service";
import { unwrapApiDataArray } from "@/utils/leaveApiOptions";

export const EMPLOYEE_MANAGERS_QUERY_KEY = ["leave", "employee-managers"] as const;

export function employeeManagersQueryKey(search?: string) {
  const normalized = search?.trim() || "";
  return [...EMPLOYEE_MANAGERS_QUERY_KEY, normalized] as const;
}

export function useEmployeeManagers(search?: string, enabled = true) {
  const normalizedSearch = search?.trim() || "";

  return useQuery({
    queryKey: employeeManagersQueryKey(normalizedSearch),
    enabled,
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<LeaveManagerOption[]> => {
      const res = await hrmsService.getLeaveManagerOptions(
        normalizedSearch ? { search: normalizedSearch } : undefined
      );
      return unwrapApiDataArray<LeaveManagerOption>(res);
    },
  });
}
