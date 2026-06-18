"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { hrmsService } from "@/services/hrms.service";

type Options = { enabled?: boolean };

function unwrapProfile(res: unknown): Record<string, unknown> {
  const envelope = res as { data?: unknown };
  const data = envelope?.data ?? res;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return {};
}

/**
 * GET /api/v1/employee-profile/{empId} — employee profile (HR + AM read; HR edit).
 * @see endpoints.profile.employeeById
 */
export function useEmployeeProfile(empId: string, options?: Options) {
  const enabled = (options?.enabled ?? true) && Boolean(empId?.trim());

  return useQuery({
    queryKey: ["employee-profile", empId, endpoints.profile.employeeById(empId)],
    enabled,
    queryFn: async () => {
      const res = await hrmsService.getEmployeeProfile(empId);
      return unwrapProfile(res);
    },
  });
}

/** PUT /api/v1/employee-profile/{empId} — HR (full) or ADMIN (status only). */
export function useUpdateEmployeeProfile(empId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      hrmsService.updateEmployeeProfile(empId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employee-profile", empId] });
      await queryClient.invalidateQueries({ queryKey: ["employee-profile", empId, "balances"] });
      await queryClient.invalidateQueries({ queryKey: ["employee-directory", "onboard"] });
    },
  });
}
