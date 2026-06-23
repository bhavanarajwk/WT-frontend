"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { exitInterviewService } from "@/services/exitInterview.service";

export function useExitInterviewFormDefinition(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["exit-interview", "form-definition", endpoints.exitInterview.formDefinition],
    enabled,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const res = await exitInterviewService.getFormDefinition();
      return res.data ?? { fields: [] };
    },
  });
}
