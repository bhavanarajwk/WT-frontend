"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatApiDate } from "@/utils/apiDate";
import { listSelfUserRequests } from "@/utils/userRequest";

export const MY_LEAVE_REQUESTS_QUERY_KEY = ["leave", "my-requests"] as const;

export function myLeaveRequestsQueryKey(email?: string | null) {
  return [...MY_LEAVE_REQUESTS_QUERY_KEY, email ?? "anonymous"] as const;
}

async function fetchMyLeaveRequests(email: string) {
  const today = new Date();
  const future = new Date(today);
  future.setFullYear(future.getFullYear() + 2);
  const merged = await listSelfUserRequests({
    fromDate: "01/01/2000",
    toDate: formatApiDate(future),
    requestType: "ALL",
    empEmail: email,
  });
  return Array.from(
    new Map(
      merged.map((row) => {
        const key = String(row.user_request_id ?? row.userRequestId ?? row.id ?? Math.random());
        return [key, row] as const;
      })
    ).values()
  );
}

export function useMyLeaveRequests(email: string, enabled = false) {
  const queryClient = useQueryClient();
  const normalizedEmail = email.trim();

  const query = useQuery({
    queryKey: myLeaveRequestsQueryKey(normalizedEmail),
    enabled: enabled && Boolean(normalizedEmail),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () => fetchMyLeaveRequests(normalizedEmail),
  });

  return {
    ...query,
    rows: query.data ?? [],
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: myLeaveRequestsQueryKey(normalizedEmail) }),
    refetch: query.refetch,
  };
}
