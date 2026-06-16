"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { hrmsService } from "@/services/hrms.service";
import type { OnboardListItem } from "@/types/onboard";
import { toPagedRows } from "@/utils/apiRows";

type Options = { enabled?: boolean };

/**
 * GET /api/v1/user/onboard — onboarded employees for directory list (HR + AM).
 * Response: GenericResponse with `data.items` (OnboardListItem[]).
 * @see endpoints.user.onboard
 */
export function useEmployeeDirectoryList(options?: Options) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["employee-directory", "onboard", endpoints.user.onboard],
    enabled,
    queryFn: async () => {
      const res = await hrmsService.getOnboardList({ page: "0", size: "500" });
      return toPagedRows(res.data) as unknown as OnboardListItem[];
    },
    staleTime: 60_000,
    refetchOnMount: false,
  });
}
