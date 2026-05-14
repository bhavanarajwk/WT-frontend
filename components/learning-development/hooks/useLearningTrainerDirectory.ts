"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { hrmsService } from "@/src/services/hrms.service";
import { toPagedRows } from "@/src/lib/apiRows";

export type TrainerOption = { id: string; label: string };

export function useLearningTrainerDirectory() {
  const userRoles = useAuth().user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");

  return useQuery({
    queryKey: ["learning", "trainerDirectory", hasHrAccess],
    queryFn: async (): Promise<TrainerOption[]> => {
      const [onboardRes, allocRes] = await Promise.all([
        hrmsService.getOnboardList({ page: "0", size: "500" }),
        hasHrAccess
          ? hrmsService.getAllocations({ page: "0", size: "500", view: "ALL" })
          : Promise.resolve({ data: [] }),
      ]);
      const onboardRows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
      const allocationRows = toPagedRows((allocRes as { data?: unknown }).data ?? allocRes);
      const mergedOnboardRows = [...onboardRows, ...allocationRows];
      return Array.from(
        new Map(
          mergedOnboardRows
            .map((row) => {
              const rawId = String(
                row.user_id ??
                  row.userId ??
                  row.emp_id ??
                  row.empId ??
                  row.id ??
                  (row.user as Record<string, unknown> | undefined)?.id ??
                  ""
              ).trim();
              const name = String(row.name ?? "Employee").trim();
              const email = String(
                row.email ?? row.user_email ?? row.userEmail ?? row.employee_email ?? row.employeeEmail ?? ""
              ).trim();
              const userId = rawId || (email ? `email:${email.toLowerCase()}` : "");
              if (!userId) return null;
              const label = email ? `${name} (${email})` : name;
              return [userId, { id: userId, label }] as const;
            })
            .filter((item): item is readonly [string, TrainerOption] => Boolean(item))
        ).values()
      );
    },
    staleTime: 60_000,
  });
}
