"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { toRows } from "@/utils/apiRows";
import { parseProjectPickerRows } from "@/utils/projectPicker";

export const HR_PROJECTS_QUERY_KEY = ["allocation", "hr", "projects"] as const;

export type HrProjectsData = {
  rawRows: Array<Record<string, unknown>>;
  pickerRows: Array<{ code: string; name: string; project_type: string; id?: number }>;
};

export async function fetchHrProjects(): Promise<HrProjectsData> {
  let rawRows: Array<Record<string, unknown>> = [];
  try {
    const res = await hrmsService.getAllProjects({});
    rawRows = toRows((res as { data?: unknown }).data ?? res);
  } catch {
    // `/projects/all` may 500 on some environments.
  }
  if (!rawRows.length) {
    try {
      const fallback = await hrmsService.getProjects({ page: "0", size: "500" });
      rawRows = toRows((fallback as { data?: unknown }).data ?? fallback);
    } catch {
      rawRows = [];
    }
  }
  return {
    rawRows,
    pickerRows: parseProjectPickerRows(rawRows),
  };
}

export function useHrProjects(enabled = true) {
  return useQuery({
    queryKey: HR_PROJECTS_QUERY_KEY,
    enabled,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: fetchHrProjects,
  });
}
