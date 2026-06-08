"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { parseAllocationPercentagesResponse } from "@/utils/allocationPercent";
import type { AllocationPercentRow } from "@/types/allocationPercent";

async function fetchAllocationPercentages(designation: string): Promise<AllocationPercentRow[]> {
  const role = designation.trim();
  const res = await hrmsService.getAllocationPercentages(
    role ? { designation: role } : {}
  );
  return parseAllocationPercentagesResponse(res);
}

/** GET /api/v1/allocation/percentages — role-based allowed values (50/100 or 25/50/75/100). */
export function useAllocationPercentages(designation = "", enabled = true) {
  const role = designation.trim();
  return useQuery({
    queryKey: ["allocation", "percentages", role],
    enabled: enabled && Boolean(role),
    queryFn: () => fetchAllocationPercentages(role),
    staleTime: 5 * 60_000,
  });
}
