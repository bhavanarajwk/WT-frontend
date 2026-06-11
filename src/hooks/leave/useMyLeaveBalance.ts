"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { hrmsService, type EmployeeLeaveBalancesData } from "@/services/hrms.service";
import { fetchSelfProfile } from "@/utils/selfProfile";

export function useMyLeaveBalance(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];
  const enabled = (options?.enabled ?? true) && Boolean(user);

  return useQuery({
    queryKey: ["leave", "my-balance", user?.email ?? ""],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<EmployeeLeaveBalancesData | null> => {
      const profile = await fetchSelfProfile(userRoles);
      const empId = String(profile?.emp_id ?? profile?.empId ?? "").trim();
      if (!empId) return null;
      const res = await hrmsService.getEmployeeLeaveBalances(empId);
      return res.data ?? null;
    },
  });
}
