"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatApiDate } from "@/utils/apiDate";
import { listScopedUserRequests } from "@/utils/userRequest";
import {
  isAssignedPrimaryLeaveManager,
  isOwnUserRequest,
  pickManagerEmailList,
} from "@/utils/leaveManagerDisplay";

export const PRIMARY_MANAGER_INBOX_QUERY_KEY = ["leave", "primary-manager-inbox"] as const;

export function primaryManagerInboxQueryKey(email?: string | null) {
  return [...PRIMARY_MANAGER_INBOX_QUERY_KEY, email ?? "anonymous"] as const;
}

function filterPrimaryManagerInbox(
  rows: Array<Record<string, unknown>>,
  actorEmail: string
): Array<Record<string, unknown>> {
  const email = actorEmail.trim().toLowerCase();
  if (!email) return [];

  return rows.filter((row) => {
    if (isOwnUserRequest(row, email)) return false;
    const primaries = pickManagerEmailList(row, "primary");
    if (!primaries.length) return true;
    return isAssignedPrimaryLeaveManager(row, email);
  });
}

async function fetchPrimaryManagerInbox(actorEmail: string): Promise<Array<Record<string, unknown>>> {
  const today = new Date();
  const start = new Date(today.getFullYear() - 1, 0, 1);
  const end = new Date(today);
  end.setFullYear(end.getFullYear() + 2);

  const rows = await listScopedUserRequests({
    fromDate: formatApiDate(start),
    toDate: formatApiDate(end),
    requestType: "LEAVE",
  });

  return filterPrimaryManagerInbox(rows, actorEmail);
}

export function usePrimaryManagerLeaveInbox(actorEmail: string, enabled = true) {
  const queryClient = useQueryClient();
  const normalizedEmail = actorEmail.trim();

  const query = useQuery({
    queryKey: primaryManagerInboxQueryKey(normalizedEmail),
    enabled: enabled && Boolean(normalizedEmail),
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () => fetchPrimaryManagerInbox(normalizedEmail),
  });

  return {
    ...query,
    rows: query.data ?? [],
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: primaryManagerInboxQueryKey(normalizedEmail),
      }),
    refetch: query.refetch,
  };
}
