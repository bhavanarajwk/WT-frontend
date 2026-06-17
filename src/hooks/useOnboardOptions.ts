"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import {
  FALLBACK_ONBOARD_OPTIONS,
  parseOnboardOptions,
} from "@/utils/onboardFormOptions";

export const ONBOARD_OPTIONS_QUERY_KEY = ["masters", "onboard-options"] as const;

export function useOnboardOptions(enabled = true) {
  return useQuery({
    queryKey: ONBOARD_OPTIONS_QUERY_KEY,
    enabled,
    staleTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      try {
        const res = await hrmsService.getOnboardOptions();
        return parseOnboardOptions(res);
      } catch {
        return FALLBACK_ONBOARD_OPTIONS;
      }
    },
  });
}
