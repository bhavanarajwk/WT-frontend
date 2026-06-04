"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { parseBenchForecastPage } from "@/utils/talentPool";

export const BENCH_FORECAST_QUERY_KEY = ["allocation", "bench-forecast"] as const;

export function useBenchForecastList(
  enabled: boolean,
  options: { days: number; page?: number; size?: number; search?: string }
) {
  const days = Math.max(1, Math.min(3650, options.days));
  const page = options.page ?? 0;
  const size = options.size ?? 50;
  const search = options.search?.trim() || undefined;

  return useQuery({
    queryKey: [...BENCH_FORECAST_QUERY_KEY, days, page, size, search ?? ""],
    enabled: enabled && days > 0,
    queryFn: async () => {
      const res = await hrmsService.getBenchForecast({ days, page, size, search });
      return parseBenchForecastPage(res);
    },
    staleTime: 60_000,
  });
}
