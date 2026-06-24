"use client";

import { useQuery } from "@tanstack/react-query";
import { holidayCalendarStorageService } from "@/services/holidayCalendarStorage.service";

export function holidayCalendarStorageQueryKey(year: number | string) {
  return ["holiday-calendar", "storage", String(year)] as const;
}

export function useHolidayCalendarStorage(year: number | string) {
  const normalizedYear = Number(year);

  return useQuery({
    queryKey: holidayCalendarStorageQueryKey(normalizedYear),
    queryFn: () => holidayCalendarStorageService.fetchByYear(normalizedYear),
    enabled: Number.isFinite(normalizedYear),
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
