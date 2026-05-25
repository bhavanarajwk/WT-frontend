"use client";

import { useCallback, useEffect, useState } from "react";
import { hrmsService } from "@/services/hrms.service";

export interface OverviewMetrics {
  totalOnboarded: number;
  unreadNotifications: number;
  timelogItems: number;
  leaveRecords: number;
}

export function useOverviewData() {
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalOnboarded: 0,
    unreadNotifications: 0,
    timelogItems: 0,
    leaveRecords: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [onboard, notifications, timelog, leaveSummary] = await Promise.all([
        hrmsService.getOnboardList({ page: "0", size: "1" }),
        hrmsService.getNotifications({ page: "0", size: "50" }),
        hrmsService.getTimelogs({ page: "0", size: "20" }),
        hrmsService.getLeaveSummary({ page: "0", size: "10" }),
      ]);

      const unreadNotifications =
        notifications.data.items?.filter((n) => !n.is_read).length ?? 0;

      const leaveRecords = Array.isArray((leaveSummary.data as { data?: unknown[] })?.data)
        ? ((leaveSummary.data as { data: unknown[] }).data?.length ?? 0)
        : 0;

      setMetrics({
        totalOnboarded: onboard.data.total ?? 0,
        unreadNotifications,
        timelogItems: timelog.data.total ?? 0,
        leaveRecords,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  return { metrics, loading, error, refresh };
}
