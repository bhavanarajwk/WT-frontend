"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSelfProfile } from "@/hooks/useSelfProfile";
import { buildExitInterviewAutofill, parseExitInterviewProfileFlags } from "@/utils/exitInterview";
import { shouldSkipSelfProfileFetch } from "@/utils/selfProfile";

export function useExitInterviewProfile(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];
  const enabled = (options?.enabled ?? true) && !shouldSkipSelfProfileFetch(userRoles);
  const profileQ = useSelfProfile(enabled);

  const data = useMemo(() => {
    const profile = profileQ.data;
    if (!profile) return null;
    return {
      profile,
      flags: parseExitInterviewProfileFlags(profile),
      autofill: buildExitInterviewAutofill(profile),
    };
  }, [profileQ.data]);

  return {
    ...profileQ,
    data,
  };
}
