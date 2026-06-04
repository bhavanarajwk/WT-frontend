"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import {
  ALLOCATION_EMPLOYEES_PAGE,
  ALLOCATION_EMPLOYEES_SIZE,
} from "@/constants/allocationApi";
import {
  parseAllocationEmployees,
  type AllocationEmployeeOption,
} from "@/utils/allocationEmployees";

async function fetchAllocationEmployees(): Promise<AllocationEmployeeOption[]> {
  const res = await hrmsService.getAllocationEmployees({
    page: ALLOCATION_EMPLOYEES_PAGE,
    size: ALLOCATION_EMPLOYEES_SIZE,
  });
  return parseAllocationEmployees(res.data ?? res);
}

/** GET /api/v1/allocation/employees — allocate-form employee directory */
export function useAllocationEmployees(enabled = true) {
  return useQuery({
    queryKey: ["allocation", "employees", ALLOCATION_EMPLOYEES_PAGE, ALLOCATION_EMPLOYEES_SIZE],
    enabled,
    queryFn: fetchAllocationEmployees,
    staleTime: 60_000,
  });
}
