import type { QueryClient } from "@tanstack/react-query";
import { hrmsService } from "@/src/services/hrms.service";
import { toPagedRows } from "@/src/lib/apiRows";

export const TRAININGS_LIST_QUERY_KEY = ["learning", "trainings", "list"] as const;

export async function fetchTrainingsListRows(
  queryClient: QueryClient
): Promise<Array<Record<string, unknown>>> {
  return queryClient.fetchQuery({
    queryKey: [...TRAININGS_LIST_QUERY_KEY],
    queryFn: async () => {
      const res = await hrmsService.getTrainings();
      return toPagedRows(res.data ?? res);
    },
    staleTime: 30_000,
  });
}

export function findTrainingInList(
  rows: Array<Record<string, unknown>>,
  trainingId: string
): Record<string, unknown> | undefined {
  const id = trainingId.trim();
  if (!id) return undefined;
  return rows.find((row) => {
    const rowId = String(row.id ?? "").trim();
    return rowId === id || rowId === String(Number(id));
  });
}
