"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { buildAllocationProjectEmployeesQuery } from "@/utils/allocationProjectQuery";
import {
  parseAllocationProjectEmployees,
  type AllocationProjectEmployee,
} from "@/utils/allocationProjectEmployees";

export type AllocationProjectEmployeesMeta = {
  projectId?: number;
  projectCode?: string;
  projectName?: string;
};

async function fetchProjectEmployees(
  projectKey: string,
  search?: string
): Promise<{ employees: AllocationProjectEmployee[]; meta: AllocationProjectEmployeesMeta }> {
  const key = projectKey.trim();
  if (!key) return { employees: [], meta: {} };
  const query = buildAllocationProjectEmployeesQuery(key, search);
  const res = await hrmsService.getAllocationProjectEmployees({
    projectCode: query.projectCode,
    projectId: query.projectId,
    search: query.search,
  });
  const payload = (res.data ?? res) as Record<string, unknown>;
  const meta: AllocationProjectEmployeesMeta = {
    projectId:
      payload.projectId !== undefined && payload.projectId !== null
        ? Number(payload.projectId)
        : payload.project_id !== undefined
          ? Number(payload.project_id)
          : undefined,
    projectCode: String(payload.projectCode ?? payload.project_code ?? "").trim() || undefined,
    projectName: String(payload.projectName ?? payload.project_name ?? "").trim() || undefined,
  };
  return {
    employees: parseAllocationProjectEmployees(payload),
    meta,
  };
}

/** GET /api/v1/allocation/project-employees?projectId= | ?projectCode= */
export function useAllocationProjectEmployees(projectKey: string, enabled = true, search?: string) {
  const key = projectKey.trim();
  return useQuery({
    queryKey: ["allocation", "project-employees", key, search ?? ""],
    enabled: enabled && Boolean(key),
    queryFn: () => fetchProjectEmployees(key, search),
    staleTime: 30_000,
  });
}
