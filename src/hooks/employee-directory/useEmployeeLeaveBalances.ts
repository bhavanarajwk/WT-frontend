"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { hrmsService } from "@/services/hrms.service";

type Options = { enabled?: boolean };

/**
 * GET /api/v1/employee-profile/{empId}/balances — leave & comp-off balances (HR / Admin view).
 */
export function useEmployeeLeaveBalances(empId: string, options?: Options) {
  const enabled = (options?.enabled ?? true) && Boolean(empId?.trim());

  return useQuery({
    queryKey: ["employee-profile", empId, "balances", endpoints.profile.employeeBalances(empId)],
    enabled,
    queryFn: async () => {
      const res = await hrmsService.getEmployeeLeaveBalances(empId);
      return res.data ?? null;
    },
  });
}
