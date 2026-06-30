"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { hrmsService, type EmployeeLeaveBalancesData } from "@/services/hrms.service";

export function useMyLeaveBalance(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const enabled = (options?.enabled ?? true) && Boolean(user);

  return useQuery({
    queryKey: ["leave", "my-balance", user?.email ?? ""],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<EmployeeLeaveBalancesData | null> => {
      const res = await hrmsService.getMyLeaveBalance();
      return res.data ?? null;
    },
  });
}
