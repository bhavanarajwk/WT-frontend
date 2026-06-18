"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { exitInterviewService } from "@/services/exitInterview.service";

export function useExitInterviewSubmissionDetail(
  lookupId: string,
  options?: { enabled?: boolean }
) {
  const id = decodeURIComponent(lookupId.trim());
  const enabled = (options?.enabled ?? true) && Boolean(id);

  return useQuery({
    queryKey: ["exit-interview", "submission", id, endpoints.exitInterview.submissionByLookupId(id)],
    enabled,
    queryFn: async () => {
      const res = await exitInterviewService.getSubmission(id);
      return res.data ?? null;
    },
  });
}
