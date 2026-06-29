"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import {
  mergeProjectAndAllocationData,
  normalizeAssignedProjects,
} from "@/utils/dashboard/projects";

export const MY_LEAVE_ALLOCATIONS_QUERY_KEY = ["leave", "my-allocations"] as const;

export function useMyLeaveAllocations(enabled: boolean) {
  return useQuery({
    queryKey: MY_LEAVE_ALLOCATIONS_QUERY_KEY,
    enabled,
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const [assignedRes, myAllocationsRes] = await Promise.all([
        hrmsService.getAssignedProjects(),
        hrmsService.getMyAllocations(),
      ]);
      const normalizedProjects = normalizeAssignedProjects(
        toPagedRows(assignedRes.data ?? assignedRes)
      );
      const myAllocations = toPagedRows(myAllocationsRes.data ?? myAllocationsRes);
      return mergeProjectAndAllocationData(normalizedProjects, myAllocations);
    },
  });
}
