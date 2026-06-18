"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { toRows } from "@/utils/apiRows";

export const ALLOCATION_ONBOARD_DIRECTORY_QUERY_KEY = [
  "allocation",
  "onboard-directory",
  "500",
] as const;

export async function fetchAllocationOnboardDirectory(): Promise<Array<Record<string, unknown>>> {
  const res = await hrmsService.getOnboardList({ page: "0", size: "500" });
  return toRows((res as { data?: unknown }).data ?? res);
}

export function useAllocationOnboardDirectory(enabled = true) {
  return useQuery({
    queryKey: ALLOCATION_ONBOARD_DIRECTORY_QUERY_KEY,
    enabled,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: fetchAllocationOnboardDirectory,
  });
}
