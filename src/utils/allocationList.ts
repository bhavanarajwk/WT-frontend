import { toRows } from "@/utils/apiRows";

/** Parse GET /allocation and GET /allocation/active-non-bench list payloads. */
export function parseAllocationListRows(data: unknown): Array<Record<string, unknown>> {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;

  const fromAllocations = toRows(o.allocations);
  if (fromAllocations.length) return fromAllocations;

  const fromItems = toRows(o.items);
  if (fromItems.length) return fromItems;

  return toRows(data);
}

/** Parse GET /allocation/forecasting paginated payloads (items, allocations, etc.). */
export function parseAllocationForecastRows(data: unknown): Array<Record<string, unknown>> {
  return parseAllocationListRows(data);
}
