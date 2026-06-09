"use client";

import { useCallback, useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { hrmsService } from "@/services/hrms.service";
import {
  dashboardFromUnallocatedPage,
  parseTalentPoolDashboard,
  parseUnallocatedPage,
  type TalentPoolDashboardData,
} from "@/utils/talentPool";

export const TALENT_POOL_QUERY_KEY = ["allocation", "talent-pool"] as const;

const PAGE_SIZE = 50;

export type TalentPoolPages = {
  unallocated: number;
};

const DEFAULT_PAGES: TalentPoolPages = { unallocated: 0 };

export function useTalentPoolTables(enabled: boolean) {
  const [data, setData] = useState<TalentPoolDashboardData | null>(null);
  const [pages, setPages] = useState<TalentPoolPages>(DEFAULT_PAGES);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (opts?: { search?: string; pages?: Partial<TalentPoolPages> }) => {
      if (!enabled) return;
      const nextSearch = opts?.search ?? debouncedSearch;
      const nextPages = { ...DEFAULT_PAGES, ...opts?.pages };

      setLoading(true);
      setError(null);
      try {
        const res = await hrmsService.getTalentPoolDashboard({
          search: nextSearch.trim() || undefined,
          unallocatedPage: nextPages.unallocated,
          unallocatedSize: PAGE_SIZE,
        });
        setData(parseTalentPoolDashboard(res));
        setPages(nextPages);
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Could not load talent pool.");
      } finally {
        setLoading(false);
      }
    },
    [enabled, debouncedSearch]
  );

  const loadUnallocatedPage = useCallback(
    async (page: number) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await hrmsService.getTalentPoolUnallocated({
          page,
          size: PAGE_SIZE,
          search: debouncedSearch.trim() || undefined,
        });
        const parsed = parseUnallocatedPage(res);
        setData(dashboardFromUnallocatedPage(parsed));
        setPages((p) => ({ ...p, unallocated: page }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load talent pool.");
      } finally {
        setLoading(false);
      }
    },
    [enabled, debouncedSearch]
  );

  useEffect(() => {
    if (!enabled) return;
    void loadDashboard({ search: debouncedSearch, pages: DEFAULT_PAGES });
  }, [enabled, debouncedSearch, loadDashboard]);

  return {
    data,
    pages,
    search,
    setSearch,
    loading,
    error,
    loadDashboard,
    loadUnallocatedPage,
    pageSize: PAGE_SIZE,
  };
}
