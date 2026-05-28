"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import { managerTeamEmails } from "@/utils/dashboard/projects";

let portfolioFetchPromise: Promise<Set<string>> | null = null;

async function fetchManagerPortfolioEmails(): Promise<Set<string>> {
  if (!portfolioFetchPromise) {
    portfolioFetchPromise = (async () => {
      try {
        const detailRes = await hrmsService.getManagerProjectsWithRoles();
        const detailRows = toPagedRows(detailRes.data ?? detailRes);
        return new Set(managerTeamEmails(detailRows));
      } catch {
        return new Set<string>();
      }
    })();
  }
  return portfolioFetchPromise;
}

/** Emails of employees on the signed-in manager's project portfolio. Fetches at most once per page load. */
export function useManagerPortfolioEmails(enabled: boolean) {
  const [teamEmails, setTeamEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const fetchedForSessionRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabledRef.current) {
      setTeamEmails(new Set());
      return new Set<string>();
    }
    setLoading(true);
    try {
      const emails = await fetchManagerPortfolioEmails();
      if (enabledRef.current) {
        setTeamEmails(emails);
        fetchedForSessionRef.current = true;
      }
      return emails;
    } finally {
      if (enabledRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setTeamEmails(new Set());
      setLoading(false);
      return;
    }
    if (fetchedForSessionRef.current) return;
    void refresh();
  }, [enabled, refresh]);

  return { teamEmails, loading, refresh };
}
