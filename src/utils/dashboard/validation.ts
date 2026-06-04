import { resolveAllocatedPercentFromRow } from "@/utils/allocationPercent";

/** Letters, spaces, common punctuation; 2–120 chars */
export function isValidPersonName(name: string): boolean {
  const t = name.trim();
  if (t.length < 2 || t.length > 120) return false;
  return /^[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\s.'-]*$/u.test(t);
}

/** Collapse spaces/dashes so "B8 - Intern", "B8-intern", and "B8 Intern" all match B8INTERN. */
export function bandNameMatchKey(name: string): string {
  return name.trim().toUpperCase().replace(/[\s\-_–—]+/g, "");
}

export function resolveInternBandId(bands: Array<Record<string, unknown>>): number {
  const internHit = bands.find((row) => {
    const name = String(row.name ?? row.band_name ?? "").trim();
    return name.length > 0 && bandNameMatchKey(name) === "B8INTERN";
  });
  const internId = internHit?.id != null ? Number(internHit.id) : NaN;
  if (Number.isFinite(internId) && internId > 0) return internId;

  const genericB8 = bands.find(
    (row) => bandNameMatchKey(String(row.name ?? row.band_name ?? "")) === "B8"
  );
  const genericId = genericB8?.id != null ? Number(genericB8.id) : NaN;
  return Number.isFinite(genericId) && genericId > 0 ? genericId : 8;
}

/** India mobile: optional +91, then 10 digits starting 6–9 */
export function isValidIndiaMobile(phone: string): boolean {
  const d = phone.replace(/[\s-]/g, "");
  if (!d) return false;
  return /^(\+91)?[6-9]\d{9}$/.test(d);
}

export function generateAutomaticProjectCode(): string {
  const part = `${Date.now()}`.slice(-6);
  return `P00${part}`;
}

/** Designations that use allocated hours 1–8 (others use 4 or 8 only). */
export function designationAllowsFlexibleHours(designation: string): boolean {
  const r = designation.trim().toLowerCase();
  if (!r) return false;
  return (
    r.includes("design") ||
    r.includes("devops") ||
    r.includes("project manager") ||
    r.includes("delivery manager") ||
    /\bpm\b/.test(r) ||
    /\bdm\b/.test(r) ||
    r.includes("chief") ||
    r.includes("ceo") ||
    r.includes("cto") ||
    r.includes("cfo") ||
    r.includes("coo") ||
    r.includes("c-suite") ||
    r.includes("csuite") ||
    r.includes("c suite") ||
    r.includes("chair")
  );
}

export const FLEXIBLE_ALLOCATION_HOUR_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
export const RESTRICTED_ALLOCATION_HOUR_OPTIONS = ["4", "8"] as const;

/** Display allocation as percent (supports allocatedPercent or legacy 4/8 hours). */
export function formatAllocatedHoursPercentLabel(hoursRaw: unknown): string {
  const raw = String(hoursRaw ?? "").trim();
  if (!raw || raw === "—") return "—";
  const pct = resolveAllocatedPercentFromRow({
    allocatedPercent: hoursRaw,
    allocated_percent: hoursRaw,
    allocatedHours: hoursRaw,
    allocated_hours: hoursRaw,
  });
  if (pct != null) return `${pct}%`;
  return raw;
}
