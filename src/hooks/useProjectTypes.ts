"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { normalizeProjectTypeRows } from "@/utils/projectTypes";
import type { ProjectTypeRow } from "@/types/projectType";

async function fetchProjectTypes(activeOnly: boolean): Promise<ProjectTypeRow[]> {
  const res = await hrmsService.getProjectTypes({ activeOnly });
  return normalizeProjectTypeRows(res.data ?? res);
}

/** GET /api/v1/project/types — active types for create; all types when activeOnly=false (filters). */
export function useProjectTypes(activeOnly = true, enabled = true) {
  return useQuery({
    queryKey: ["project", "types", activeOnly],
    enabled,
    queryFn: () => fetchProjectTypes(activeOnly),
    staleTime: 5 * 60_000,
  });
}
