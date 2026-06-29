"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { hrmsService, type EmployeeLeaveBalancesData } from "@/services/hrms.service";
import { endpoints } from "@/api/endpoints";
import { ApiError } from "@/api/error";

export function useMyLeaveBalance(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const enabled = (options?.enabled ?? true) && Boolean(user);

  return useQuery({
    queryKey: ["leave", "my-balance", user?.email ?? "", endpoints.profile.selfBalances],
    enabled,
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        return false;
      }
      return failureCount < 1;
    },
    queryFn: async (): Promise<EmployeeLeaveBalancesData | null> => {
      const res = await hrmsService.getMyLeaveBalances();
      return res.data ?? null;
    },
  });
}
