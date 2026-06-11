import type { Designation } from "@/types/masters";
import { toRows } from "@/utils/apiRows";

/** GET /masters/bands returns a bare array `[{ id, name }, ...]`. */
export function parseBandsList(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) {
    return raw.filter((row) => row && typeof row === "object") as Array<Record<string, unknown>>;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const envelope = raw as Record<string, unknown>;
    const nested = envelope.data;
    if (Array.isArray(nested)) {
      return nested.filter((row) => row && typeof row === "object") as Array<Record<string, unknown>>;
    }
  }
  return toRows(raw);
}

/** GET /masters/designations returns a bare array (no { message, data } wrapper). */
export function parseDesignationList(raw: unknown): Designation[] {
  const rows = Array.isArray(raw) ? raw : toRows(raw);
  return rows
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name ?? row.designation ?? row.role ?? "").trim(),
      band_id: row.band_id != null ? Number(row.band_id) : null,
      department: row.department != null ? String(row.department).trim() : null,
      created_at: row.created_at != null ? String(row.created_at) : undefined,
      updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
    }))
    .filter((item) => item.name && Number.isFinite(item.id));
}

/** POST /masters/designations returns a single object (no wrapper). */
export function parseDesignation(raw: unknown): Designation | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const list = parseDesignationList(raw);
    return list[0] ?? null;
  }
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim();
  if (!name) return null;
  return {
    id: Number(row.id),
    name,
    band_id: row.band_id != null ? Number(row.band_id) : null,
    department: row.department != null ? String(row.department).trim() : null,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}
