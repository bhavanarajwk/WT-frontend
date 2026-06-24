"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import {
  filterInNoticeFollowUpRows,
  mergeExitSurveyFollowUpRows,
  type ExitSurveyFollowUpRow,
} from "@/utils/exitSurveyFollowUp";
import type { OffboardListItem } from "@/types/offboard";

const FOLLOW_UP_FETCH_SIZE = 100;

export const EXIT_SURVEY_FOLLOW_UP_QUERY_KEY = ["exit-survey", "follow-up"] as const;

export function exitSurveyFollowUpQueryKey(filters: {
  search: string;
  filterType: string;
  filterFromDate: string;
  filterToDate: string;
}) {
  return [
    ...EXIT_SURVEY_FOLLOW_UP_QUERY_KEY,
    filters.search.trim(),
    filters.filterType.trim(),
    filters.filterFromDate.trim(),
    filters.filterToDate.trim(),
  ] as const;
}

export type ExitSurveyFollowUpQueryResult = {
  rows: ExitSurveyFollowUpRow[];
  warning?: string;
};

async function fetchExitSurveyFollowUpRows(filters: {
  search: string;
  filterType: string;
  filterFromDate: string;
  filterToDate: string;
}): Promise<ExitSurveyFollowUpQueryResult> {
  const hasCustomLwdFilter = Boolean(
    filters.filterFromDate.trim() || filters.filterToDate.trim()
  );
  const search = filters.search.trim();

  const [offboardResult, onboardResult] = await Promise.allSettled([
    hrmsService.getOffboardList({
      page: 0,
      size: FOLLOW_UP_FETCH_SIZE,
      search: search || undefined,
      type: filters.filterType.trim() || undefined,
      fromDate: hasCustomLwdFilter ? filters.filterFromDate.trim() || undefined : undefined,
      toDate: hasCustomLwdFilter ? filters.filterToDate.trim() || undefined : undefined,
    }),
    hrmsService.getOnboardList({ page: "0", size: "500" }),
  ]);

  const offboardRes = offboardResult.status === "fulfilled" ? offboardResult.value : null;
  const onboardRes = onboardResult.status === "fulfilled" ? onboardResult.value : null;

  if (offboardResult.status === "rejected" && onboardResult.status === "rejected") {
    throw offboardResult.reason;
  }

  const onboardRows = onboardRes
    ? toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes)
    : [];
  const inNoticeRows = filterInNoticeFollowUpRows(onboardRows, {
    search: filters.search,
    type: filters.filterType,
    fromDate: hasCustomLwdFilter ? filters.filterFromDate : undefined,
    toDate: hasCustomLwdFilter ? filters.filterToDate : undefined,
  });
  const rows = mergeExitSurveyFollowUpRows(
    (offboardRes?.data?.items ?? []) as OffboardListItem[],
    inNoticeRows
  );

  let warning: string | undefined;
  if (offboardResult.status === "rejected") {
    const reason = offboardResult.reason;
    warning =
      reason instanceof ApiError
        ? reason.message
        : reason instanceof Error
          ? reason.message
          : "Offboard list failed; showing in-notice employees only.";
  }

  return { rows, warning };
}

export function useExitSurveyFollowUpList(filters: {
  search: string;
  filterType: string;
  filterFromDate: string;
  filterToDate: string;
  enabled?: boolean;
}) {
  const enabled = filters.enabled ?? true;

  return useQuery({
    queryKey: exitSurveyFollowUpQueryKey(filters),
    enabled,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () => fetchExitSurveyFollowUpRows(filters),
  });
}
