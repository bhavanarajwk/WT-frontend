/** Unwrap `{ message, data: { items } }` (and one nested data layer) from BFF/API responses. */
export function unwrapLeaveOptionItems<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  let data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = data as Record<string, unknown>;
    if (nested.items == null && nested.data && typeof nested.data === "object") {
      data = nested.data;
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const items = (data as Record<string, unknown>).items;
  return Array.isArray(items) ? (items as T[]) : [];
}
