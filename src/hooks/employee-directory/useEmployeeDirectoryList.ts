"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";

type Options = { enabled?: boolean };

/**
 * GET /api/v1/user/onboard — onboarded employees for directory list (HR + AM).
 * @see endpoints.user.onboard
 */
export function useEmployeeDirectoryList(options?: Options) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["employee-directory", "onboard", endpoints.user.onboard],
    enabled,
    queryFn: async () => {
      const res = await hrmsService.getOnboardList({ page: "0", size: "500" });
      return toPagedRows((res as { data?: unknown }).data ?? res) as Array<Record<string, unknown>>;
    },
    staleTime: 60_000,
  });
}
