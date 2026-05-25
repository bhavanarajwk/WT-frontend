"use client";

import { useQuery } from "@tanstack/react-query";
import {
  accountManagerOptionsFromOnboard,
  isActiveOnboardRow,
  onboardRowsToEmployeeOptions,
  type OnboardEmployeeOption,
} from "@/utils/learning/onboardOptions";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";

export type TrainerOption = { id: string; label: string };

async function fetchOnboardRows(): Promise<Array<Record<string, unknown>>> {
  const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "500" });
  return toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
}

/** ACTIVE employees from GET /api/v1/user/onboard for trainer/trainee pickers. */
async function fetchActiveOnboardRows(): Promise<Array<Record<string, unknown>>> {
  const onboardRes = await hrmsService.getOnboardList({
    page: "0",
    size: "500",
    onboardingStatus: "ACTIVE",
  });
  let rows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes).filter(
    isActiveOnboardRow
  );
  if (!rows.length) {
    const fallback = await hrmsService.getOnboardList({ page: "0", size: "500" });
    rows = toPagedRows((fallback as { data?: unknown }).data ?? fallback).filter(
      isActiveOnboardRow
    );
  }
  return rows;
}

/** Employees from GET /api/v1/user/onboard for trainer/trainee pickers. */
export function useLearningTrainerDirectory(enabled = true) {
  return useQuery({
    queryKey: ["learning", "onboardEmployees", "active"],
    enabled,
    queryFn: async (): Promise<TrainerOption[]> => {
      const options = onboardRowsToEmployeeOptions(await fetchActiveOnboardRows());
      return options.map(({ id, label }) => ({ id, label }));
    },
    staleTime: 60_000,
  });
}

/** Account managers from GET /api/v1/user/onboard (falls back to all onboard if none tagged). */
export function useOnboardAccountManagers() {
  return useQuery({
    queryKey: ["onboard", "accountManagers"],
    queryFn: async (): Promise<OnboardEmployeeOption[]> => {
      return accountManagerOptionsFromOnboard(await fetchOnboardRows());
    },
    staleTime: 60_000,
  });
}
