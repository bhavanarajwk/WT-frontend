"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { normalizeAllocationPercentRows } from "@/utils/allocationPercent";
import type { AllocationPercentRow } from "@/types/allocationPercent";

async function fetchAllocationPercentages(): Promise<AllocationPercentRow[]> {
  const res = await hrmsService.getAllocationPercentages();
  return normalizeAllocationPercentRows(res.data ?? res);
}

/** GET /api/v1/allocation/percentages — allowed allocatedPercent values (e.g. 50, 100). */
export function useAllocationPercentages(enabled = true) {
  return useQuery({
    queryKey: ["allocation", "percentages"],
    enabled,
    queryFn: fetchAllocationPercentages,
    staleTime: 5 * 60_000,
  });
}
