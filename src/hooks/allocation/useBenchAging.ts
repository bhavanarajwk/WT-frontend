"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { parseBenchAgingPage } from "@/utils/reports/parseBenchAgingPage";

const BENCH_AGING_PAGE_SIZE = 500;

export function useBenchAging(
  enabled: boolean,
  options?: { search?: string; as_of?: string }
) {
  const search = options?.search?.trim() || undefined;
  const as_of = options?.as_of?.trim() || undefined;

  return useQuery({
    queryKey: ["reports", "bench-aging", search ?? "", as_of ?? ""],
    enabled,
    queryFn: async () => {
      const res = await hrmsService.getBenchAging({
        page: 0,
        size: BENCH_AGING_PAGE_SIZE,
        search,
        as_of,
      });
      const payload = ((res as { data?: unknown }).data ?? {}) as Record<string, unknown>;
      return parseBenchAgingPage(payload);
    },
    staleTime: 60_000,
  });
}
