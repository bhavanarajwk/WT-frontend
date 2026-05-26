"use client";

import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import { buildAccountManagerEmailSet } from "@/utils/learning/onboardOptions";

export function useAccountManagerEmails() {
  return useQuery({
    queryKey: ["onboard", "account-manager-emails"],
    queryFn: async () => {
      const res = await hrmsService.getOnboardList({ page: "0", size: "500" });
      const rows = toPagedRows((res as { data?: unknown }).data ?? res);
      return buildAccountManagerEmailSet(rows);
    },
    staleTime: 60_000,
  });
}
