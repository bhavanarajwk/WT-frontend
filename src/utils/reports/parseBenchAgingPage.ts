import { toRows } from "@/utils/apiRows";

function readTotalElements(source: Record<string, unknown>): number | null {
  const raw = source.total_elements ?? source.totalElements ?? source.total_count ?? source.totalCount;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw;
  return null;
}

/** Parse GET /reports/utilization/bench-aging envelope into rows and total headcount. */
export function parseBenchAgingPage(input: unknown): {
  rows: Array<Record<string, unknown>>;
  totalElements: number | null;
} {
  const root = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const page =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  const rows = toRows(page.data ?? page);
  const totalElements = readTotalElements(page) ?? readTotalElements(root);
  return { rows, totalElements };
}
