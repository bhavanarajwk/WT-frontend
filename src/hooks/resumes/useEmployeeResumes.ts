"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { hrmsService } from "@/services/hrms.service";
import { parseEmployeeResumeResponse, type EmployeeResumePayload } from "@/utils/employeeResume";

type Options = { enabled?: boolean };

/**
 * GET /api/v1/employee-resume
 */
export function useEmployeeResumes(options?: Options) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["employee-resumes", endpoints.employeeResume.root],
    enabled,
    queryFn: async (): Promise<EmployeeResumePayload> => {
      const res = await hrmsService.getEmployeeResumes({ page: "0", size: "500" });
      return parseEmployeeResumeResponse(res);
    },
    staleTime: 60_000,
  });
}
