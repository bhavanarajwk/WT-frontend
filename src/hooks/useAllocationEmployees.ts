"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import {
  ALLOCATION_EMPLOYEES_PAGE,
  ALLOCATION_EMPLOYEES_SIZE,
} from "@/constants/allocationApi";
import { toPagedRows } from "@/utils/apiRows";
import { isActiveOnboardRow } from "@/utils/learning/onboardOptions";
import {
  parseActiveOnboardEmployees,
  type AllocationEmployeeOption,
} from "@/utils/allocationEmployees";

async function fetchActiveOnboardEmployees(): Promise<AllocationEmployeeOption[]> {
  const onboardRes = await hrmsService.getOnboardList({
    page: ALLOCATION_EMPLOYEES_PAGE,
    size: ALLOCATION_EMPLOYEES_SIZE,
    onboardingStatus: "ACTIVE",
  });
  let rows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes).filter(
    isActiveOnboardRow
  );
  if (!rows.length) {
    const fallback = await hrmsService.getOnboardList({
      page: ALLOCATION_EMPLOYEES_PAGE,
      size: ALLOCATION_EMPLOYEES_SIZE,
    });
    rows = toPagedRows((fallback as { data?: unknown }).data ?? fallback).filter(
      isActiveOnboardRow
    );
  }
  return parseActiveOnboardEmployees(rows);
}

/** ACTIVE employees from GET /api/v1/user/onboard — allocate-form employee directory */
export function useAllocationEmployees(enabled = true) {
  return useQuery({
    queryKey: [
      "allocation",
      "employees",
      "active",
      ALLOCATION_EMPLOYEES_PAGE,
      ALLOCATION_EMPLOYEES_SIZE,
    ],
    enabled,
    queryFn: fetchActiveOnboardEmployees,
    staleTime: 60_000,
  });
}
