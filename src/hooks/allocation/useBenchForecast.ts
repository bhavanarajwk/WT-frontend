"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { extractFirstObjectArray, toPagedRows } from "@/utils/apiRows";

export function useBenchForecast(days: number, enabled: boolean) {
  const safeDays = Math.max(1, Math.min(365, days));

  return useQuery({
    queryKey: ["allocation", "bench-forecast", safeDays],
    enabled,
    queryFn: async () => {
      const res = await hrmsService.getBenchForecast(safeDays);
      const envelope = res as { data?: unknown };
      const raw = envelope?.data ?? res;
      let rows = toPagedRows(raw);
      if (!rows.length) rows = extractFirstObjectArray(raw);
      return { raw, rows };
    },
    staleTime: 60_000,
  });
}
