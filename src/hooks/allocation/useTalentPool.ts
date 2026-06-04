"use client";

import { useCallback, useState } from "react";
import { hrmsService } from "@/services/hrms.service";
import {
  parseNonBillablePage,
  parseOnBenchPage,
  parseTalentPoolDashboard,
  parseUnallocatedPage,
  type TalentPoolDashboardData,
  type TalentPoolTableKey,
} from "@/utils/talentPool";

export const TALENT_POOL_QUERY_KEY = ["allocation", "talent-pool"] as const;

const PAGE_SIZE = 50;

export type TalentPoolPages = {
  onBench: number;
  unallocated: number;
  nonBillable: number;
};

const DEFAULT_PAGES: TalentPoolPages = { onBench: 0, unallocated: 0, nonBillable: 0 };

export function useTalentPoolTables(enabled: boolean) {
  const [data, setData] = useState<TalentPoolDashboardData | null>(null);
  const [pages, setPages] = useState<TalentPoolPages>(DEFAULT_PAGES);
  const [search, setSearch] = useState("");
  const [allocationType, setAllocationType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (opts?: {
      search?: string;
      allocationType?: string;
      pages?: Partial<TalentPoolPages>;
    }) => {
      if (!enabled) return;
      const nextSearch = opts?.search ?? search;
      const nextType = opts?.allocationType ?? allocationType;
      const nextPages = { ...DEFAULT_PAGES, ...opts?.pages };

      setLoading(true);
      setError(null);
      try {
        const res = await hrmsService.getTalentPoolDashboard({
          search: nextSearch.trim() || undefined,
          allocationType: nextType.trim() || undefined,
          onBenchPage: nextPages.onBench,
          onBenchSize: PAGE_SIZE,
          unallocatedPage: nextPages.unallocated,
          unallocatedSize: PAGE_SIZE,
          nonBillablePage: nextPages.nonBillable,
          nonBillableSize: PAGE_SIZE,
        });
        setData(parseTalentPoolDashboard(res));
        setPages(nextPages);
        setSearch(nextSearch);
        setAllocationType(nextType);
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Could not load talent pool.");
      } finally {
        setLoading(false);
      }
    },
    [enabled, search, allocationType]
  );

  const loadTablePage = useCallback(
    async (table: TalentPoolTableKey, page: number) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const base = { page, size: PAGE_SIZE, search: search.trim() || undefined };
        if (table === "onBench") {
          const res = await hrmsService.getTalentPool(base);
          const parsed = parseOnBenchPage(res);
          setData((prev) =>
            prev
              ? { ...prev, on_bench: parsed }
              : {
                  label: "Talent Pool",
                  on_bench: parsed,
                  unallocated: parseUnallocatedPage({ data: { items: [] } }),
                  non_billable: parseNonBillablePage({ data: { items: [] } }),
                }
          );
          setPages((p) => ({ ...p, onBench: page }));
        } else if (table === "unallocated") {
          const res = await hrmsService.getTalentPoolUnallocated(base);
          const parsed = parseUnallocatedPage(res);
          setData((prev) =>
            prev
              ? { ...prev, unallocated: parsed }
              : {
                  label: "Talent Pool",
                  on_bench: parseOnBenchPage({ data: { items: [] } }),
                  unallocated: parsed,
                  non_billable: parseNonBillablePage({ data: { items: [] } }),
                }
          );
          setPages((p) => ({ ...p, unallocated: page }));
        } else {
          const res = await hrmsService.getTalentPoolNonBillable({
            ...base,
            allocationType: allocationType.trim() || undefined,
          });
          const parsed = parseNonBillablePage(res);
          setData((prev) =>
            prev
              ? { ...prev, non_billable: parsed }
              : {
                  label: "Talent Pool",
                  on_bench: parseOnBenchPage({ data: { items: [] } }),
                  unallocated: parseUnallocatedPage({ data: { items: [] } }),
                  non_billable: parsed,
                }
          );
          setPages((p) => ({ ...p, nonBillable: page }));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load table.");
      } finally {
        setLoading(false);
      }
    },
    [enabled, search, allocationType]
  );

  const applyFilters = useCallback(
    (nextSearch: string, nextAllocationType: string) => {
      void loadDashboard({
        search: nextSearch,
        allocationType: nextAllocationType,
        pages: DEFAULT_PAGES,
      });
    },
    [loadDashboard]
  );

  return {
    data,
    pages,
    search,
    allocationType,
    loading,
    error,
    loadDashboard,
    loadTablePage,
    applyFilters,
    pageSize: PAGE_SIZE,
  };
}
