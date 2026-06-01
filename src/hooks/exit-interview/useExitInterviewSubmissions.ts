"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { exitInterviewService } from "@/services/exitInterview.service";
import type { ExitInterviewSubmissionsQuery } from "@/types/exit-interview";

export function useExitInterviewSubmissions(
  params: ExitInterviewSubmissionsQuery,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const status = params.status ?? "SUBMITTED";
  const search = params.search?.trim() ?? "";

  return useQuery({
    queryKey: [
      "exit-interview",
      "submissions",
      endpoints.exitInterview.submissions,
      page,
      size,
      status,
      search,
    ],
    enabled,
    queryFn: async () => {
      const res = await exitInterviewService.listSubmissions({
        page,
        size,
        status,
        search: search || undefined,
      });
      return (
        res.data ?? {
          items: [],
          total: 0,
          page,
          size,
        }
      );
    },
  });
}
