"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { endpoints } from "@/api/endpoints";
import { buildExitInterviewAutofill, parseExitInterviewProfileFlags } from "@/utils/exitInterview";
import { fetchSelfProfile, shouldSkipSelfProfileFetch } from "@/utils/selfProfile";

export function useExitInterviewProfile(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];
  const enabled = (options?.enabled ?? true) && !shouldSkipSelfProfileFetch(userRoles);

  return useQuery({
    queryKey: ["profile", "exit-interview", endpoints.profile.self],
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const profile = await fetchSelfProfile(userRoles);
      if (!profile) return null;
      return {
        profile,
        flags: parseExitInterviewProfileFlags(profile),
        autofill: buildExitInterviewAutofill(profile),
      };
    },
  });
}
