"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatApiDate } from "@/utils/apiDate";
import { listSelfUserRequests } from "@/utils/userRequest";

export const MY_LEAVE_REQUESTS_QUERY_KEY = ["leave", "my-requests"] as const;

export function myLeaveRequestsQueryKey(email?: string | null) {
  return [...MY_LEAVE_REQUESTS_QUERY_KEY, email ?? "anonymous"] as const;
}

function dedupeByRequestId(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return Array.from(
    new Map(
      rows.map((row) => {
        const key = String(row.user_request_id ?? row.userRequestId ?? row.id ?? Math.random());
        return [key, row] as const;
      })
    ).values()
  );
}

async function fetchMyLeaveRequests(): Promise<Array<Record<string, unknown>>> {
  const today = new Date();
  const past = new Date(today);
  past.setFullYear(past.getFullYear() - 1);
  const future = new Date(today);
  future.setFullYear(future.getFullYear() + 2);
  const range = {
    fromDate: formatApiDate(past),
    toDate: formatApiDate(future),
    requestType: "ALL" as const,
    size: 200,
  };

  const rows = await listSelfUserRequests(range);
  return dedupeByRequestId(rows);
}

export function useMyLeaveRequests(email: string, enabled = false) {
  const queryClient = useQueryClient();
  const normalizedEmail = email.trim();

  const query = useQuery({
    queryKey: myLeaveRequestsQueryKey(normalizedEmail),
    enabled: enabled && Boolean(normalizedEmail),
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: fetchMyLeaveRequests,
  });

  return {
    ...query,
    rows: query.data ?? [],
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: myLeaveRequestsQueryKey(normalizedEmail) }),
    refetch: query.refetch,
  };
}
