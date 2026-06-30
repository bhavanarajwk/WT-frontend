"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showErrorToast } from "@/lib/toast";
import { hrmsService } from "@/services/hrms.service";
import type { HrOffboardListItem } from "@/types/offboard";
import { toPagedRows } from "@/utils/apiRows";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { isServingNoticeUserStatus, normalizeEmployeeStatusKey } from "@/utils/userStatus";

export type OffboardCandidate = {
  emp_id: string;
  name: string;
  email: string;
  user_type: string;
  band: string;
};

export const OFFBOARDING_LIST_PAGE_SIZE = 10;

const OFFBOARDING_STALE_MS = 5 * 60_000;
const OFFBOARDING_LIST_STALE_MS = 30_000;

function defaultFinancialYearStart(): string {
  const now = new Date();
  const year = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return String(year);
}

function parseFinancialYear(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100) {
    return parsed;
  }
  return Number(defaultFinancialYearStart());
}

function exitSplitPercent(part: unknown, total: unknown): number {
  const p = Number(part);
  const t = Number(total);
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return 0;
  return Math.round((p / t) * 1000) / 10;
}

function buildOffboardCandidates(
  onboardRows: Array<Record<string, unknown>>,
  offboardedItems: HrOffboardListItem[]
): OffboardCandidate[] {
  const offboardedIds = new Set(
    offboardedItems.map((row) => String(row.emp_id ?? "").trim().toLowerCase())
  );

  return Array.from(
    new Map(
      onboardRows
        .map((row) => {
          const emp_id = String(row.emp_id ?? row.empId ?? "").trim();
          if (!emp_id || offboardedIds.has(emp_id.toLowerCase())) return null;
          const status = String(row.status ?? "").trim().toUpperCase();
          if (
            normalizeEmployeeStatusKey(status) === "INACTIVE" ||
            isServingNoticeUserStatus(status)
          ) {
            return null;
          }
          const name = String(row.name ?? "—").trim() || "—";
          const email = String(row.email ?? "—").trim() || "—";
          const user_type = String(row.user_type ?? row.userType ?? "").trim().toUpperCase();
          const band =
            String(row.band ?? row.band_name ?? row.bandName ?? row.band_id ?? row.bandId ?? "")
              .trim() || "—";
          return [emp_id.toLowerCase(), { emp_id, name, email, user_type, band }] as const;
        })
        .filter((entry): entry is readonly [string, OffboardCandidate] => Boolean(entry))
    ).values()
  ).sort((a, b) => a.emp_id.localeCompare(b.emp_id));
}

export function useOffboardingPanelQueries() {
  const queryClient = useQueryClient();

  const [listPage, setListPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterType, setFilterType] = useState("");
  const [fyStartYear, setFyStartYear] = useState(defaultFinancialYearStart);

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      type: filterType.trim() || undefined,
      fromDate: filterFromDate.trim() || undefined,
      toDate: filterToDate.trim() || undefined,
    }),
    [debouncedSearch, filterType, filterFromDate, filterToDate]
  );

  const listFiltersKey = useMemo(() => JSON.stringify(listFilters), [listFilters]);
  const lastListFiltersKey = useRef(listFiltersKey);
  let queryPage = listPage;
  if (lastListFiltersKey.current !== listFiltersKey) {
    lastListFiltersKey.current = listFiltersKey;
    queryPage = 0;
  }

  useEffect(() => {
    if (queryPage === 0 && listPage !== 0) {
      setListPage(0);
    }
  }, [listFiltersKey, listPage, queryPage]);

  const fyYear = useMemo(() => parseFinancialYear(fyStartYear), [fyStartYear]);

  const attritionQ = useQuery({
    queryKey: ["offboarding", "attrition", fyYear],
    queryFn: async () => {
      const [overallRes, viRes] = await Promise.all([
        hrmsService.getAttritionOverallPercent({ fy_start_year: fyYear }),
        hrmsService.getAttritionVoluntaryInvoluntary({ fy_start_year: fyYear }),
      ]);
      const overall = ((overallRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
      const vi = ((viRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
      const voluntaryCount = Number(vi.voluntary_count ?? 0);
      const involuntaryCount = Number(vi.involuntary_count ?? 0);
      const totalCount = Number(vi.total_count ?? voluntaryCount + involuntaryCount);

      return {
        attritionPercent: Number(overall.attrition_percent ?? 0),
        attritionExitCount: Number(overall.number_of_exits ?? totalCount),
        voluntaryPercent: exitSplitPercent(voluntaryCount, totalCount),
        involuntaryPercent: exitSplitPercent(involuntaryCount, totalCount),
      };
    },
    staleTime: OFFBOARDING_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const candidatesQ = useQuery({
    queryKey: ["offboarding", "candidates"],
    queryFn: async () => {
      const [onboardRes, offboardRes] = await Promise.all([
        hrmsService.getOnboardList({ page: "0", size: "500", onboardingStatus: "ACTIVE" }),
        hrmsService.getOffboardList({ page: 0, size: 200 }),
      ]);
      const onboardRows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
      const offboardedItems = (offboardRes.data?.items ?? []) as HrOffboardListItem[];
      return buildOffboardCandidates(onboardRows, offboardedItems);
    },
    staleTime: OFFBOARDING_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const listQ = useQuery({
    queryKey: ["offboarding", "list", queryPage, OFFBOARDING_LIST_PAGE_SIZE, listFilters],
    queryFn: async () => {
      const res = await hrmsService.getOffboardList({
        page: queryPage,
        size: OFFBOARDING_LIST_PAGE_SIZE,
        ...listFilters,
      });
      return {
        items: (res.data?.items ?? []) as HrOffboardListItem[],
        total: res.data?.total ?? 0,
      };
    },
    staleTime: OFFBOARDING_LIST_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const refreshOffboardingData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["offboarding"] });
  }, [queryClient]);

  const updateFyStartYear = useCallback((value: string) => {
    setFyStartYear((current) => (current === value ? current : value));
  }, []);

  const updateFilterFromDate = useCallback((value: string) => {
    setFilterFromDate((current) => (current === value ? current : value));
  }, []);

  const updateFilterToDate = useCallback((value: string) => {
    setFilterToDate((current) => (current === value ? current : value));
  }, []);

  const updateFilterType = useCallback((value: string) => {
    setFilterType((current) => (current === value ? current : value));
  }, []);

  const offboardCandidates = candidatesQ.data ?? [];
  const offboardedRows = listQ.data?.items ?? [];
  const listTotal = listQ.data?.total ?? 0;
  const loadingAttrition = attritionQ.isLoading && !attritionQ.data;
  const loadingCandidates = candidatesQ.isLoading && !candidatesQ.data;
  const loadingList = listQ.isFetching;

  useEffect(() => {
    if (!listQ.isError) return;
    const error = listQ.error;
    const msg =
      error instanceof Error ? error.message : "Failed to load offboarded employees.";
    showErrorToast(msg);
  }, [listQ.isError, listQ.error]);

  useEffect(() => {
    if (!candidatesQ.isError) return;
    showErrorToast("Failed to load active employees for offboarding.");
  }, [candidatesQ.isError]);

  return {
    listPage,
    setListPage,
    search,
    setSearch,
    filterFromDate,
    setFilterFromDate: updateFilterFromDate,
    filterToDate,
    setFilterToDate: updateFilterToDate,
    filterType,
    setFilterType: updateFilterType,
    fyStartYear,
    setFyStartYear: updateFyStartYear,
    offboardCandidates,
    offboardedRows,
    listTotal,
    loadingAttrition,
    loadingCandidates,
    loadingList,
    attritionPercent: attritionQ.data?.attritionPercent ?? null,
    voluntaryPercent: attritionQ.data?.voluntaryPercent ?? null,
    involuntaryPercent: attritionQ.data?.involuntaryPercent ?? null,
    attritionExitCount: attritionQ.data?.attritionExitCount ?? null,
    refreshOffboardingData,
    refetchList: listQ.refetch,
  };
}

export function financialYearSelectOptions() {
  return Array.from({ length: Math.max(new Date().getFullYear() - 2019 + 1, 1) }, (_, idx) => {
    const year = String(2019 + idx);
    return {
      value: year,
      label: `FY ${year}–${String(Number(year) + 1).slice(-2)}`,
    };
  });
}
