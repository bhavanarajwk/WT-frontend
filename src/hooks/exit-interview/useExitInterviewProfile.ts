"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { hrmsService } from "@/services/hrms.service";
import { buildExitInterviewAutofill, parseExitInterviewProfileFlags } from "@/utils/exitInterview";

export function useExitInterviewProfile(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["profile", "exit-interview", endpoints.profile.self],
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await hrmsService.getMyProfile();
      const profile = (res.data ?? null) as Record<string, unknown> | null;
      if (!profile) return null;
      return {
        profile,
        flags: parseExitInterviewProfileFlags(profile),
        autofill: buildExitInterviewAutofill(profile),
      };
    },
  });
}
