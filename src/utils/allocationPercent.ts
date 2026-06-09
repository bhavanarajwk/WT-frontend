import type { SelectFieldOption } from "@/components/dashboard/ui/forms";
import type { AllocationPercentRow } from "@/types/allocationPercent";
import { toRows } from "@/utils/apiRows";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Unwrap GET /allocation/percentages envelope → items array. */
export function parseAllocationPercentagesResponse(response: unknown): AllocationPercentRow[] {
  const envelope = isRecord(response) ? response : null;
  const payload = envelope?.data ?? response;
  if (Array.isArray(payload)) return normalizeAllocationPercentRows(payload);
  if (isRecord(payload) && Array.isArray(payload.items)) {
    return normalizeAllocationPercentRows(payload.items);
  }
  return normalizeAllocationPercentRows(payload);
}

export function normalizeAllocationPercentRows(data: unknown): AllocationPercentRow[] {
  const rows = toRows(data);
  return rows
    .map((row) => {
      const codeRaw = row.code ?? row.value ?? row.percent;
      const code = Number(codeRaw);
      const label = String(row.label ?? row.name ?? "").trim();
      if (!Number.isFinite(code) || code <= 0) return null;
      const sortRaw = row.sortOrder ?? row.sort_order;
      const sortOrder =
        sortRaw === undefined || sortRaw === null || sortRaw === ""
          ? 0
          : Number(sortRaw);
      return {
        code,
        label: label || `${code}%`,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      };
    })
    .filter((row): row is AllocationPercentRow => row != null)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.code - b.code
    );
}

export function allocationPercentSelectOptions(
  types: AllocationPercentRow[]
): SelectFieldOption[] {
  return types.map((t) => ({ value: String(t.code), label: t.label }));
}

export function allocationPercentLabelByCode(
  types: AllocationPercentRow[]
): Record<number, string> {
  return Object.fromEntries(types.map((t) => [t.code, t.label]));
}

/** Designer, DevOps, and manager roles use 25/50/75/100%; others use 50/100%. */
export function designationAllowsExtendedAllocationPercent(designation: string): boolean {
  const r = designation.trim().toLowerCase();
  if (!r) return false;
  return r.includes("designer") || r.includes("devops") || r.includes("manager");
}

/** @deprecated use designationAllowsExtendedAllocationPercent */
export function designationAllowsFineAllocationPercent(designation: string): boolean {
  return designationAllowsExtendedAllocationPercent(designation);
}

function fallbackAllocationPercentOptions(designation: string): AllocationPercentRow[] {
  const percents = designationAllowsExtendedAllocationPercent(designation)
    ? [25, 50, 75, 100]
    : [50, 100];
  return percents.map((code, index) => ({
    code,
    label: `${code}%`,
    sortOrder: index + 1,
  }));
}

export function allocationPercentOptionsForDesignation(
  designation: string,
  apiOptions: AllocationPercentRow[]
): AllocationPercentRow[] {
  if (apiOptions.length) return apiOptions;
  return fallbackAllocationPercentOptions(designation);
}

export function allocationPercentFilterOptions(types: AllocationPercentRow[]): SelectFieldOption[] {
  return [{ value: "ALL", label: "All types" }, ...allocationPercentSelectOptions(types)];
}

export function isValidAllocationPercentForDesignation(
  code: string,
  designation: string,
  apiOptions: AllocationPercentRow[]
): boolean {
  return isKnownAllocationPercent(
    code,
    allocationPercentOptionsForDesignation(designation, apiOptions)
  );
}

/** Map legacy hours (4/8) or percent fields to allocation percent code. */
export function resolveAllocatedPercentFromRow(row: Record<string, unknown>): number | null {
  const percentRaw =
    row.allocatedPercent ?? row.allocated_percent ?? row.allocated_percent_code;
  if (percentRaw !== undefined && percentRaw !== null && percentRaw !== "") {
    const pct = Number(percentRaw);
    if (Number.isFinite(pct) && pct > 0) return pct;
  }

  const hoursRaw = row.allocatedHours ?? row.allocated_hours ?? row.hours;
  if (hoursRaw === undefined || hoursRaw === null || hoursRaw === "") return null;

  const hours = Number(String(hoursRaw).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(hours) || hours <= 0) return null;
  if (hours === 4) return 50;
  if (hours === 8) return 100;
  if (hours === 2) return 25;
  if (hours === 6) return 75;
  if (hours === 50 || hours === 100) return hours;
  const asPct = Math.min(100, Math.round((hours / 8) * 100));
  return asPct > 0 ? asPct : null;
}

export function formatAllocatedPercentDisplay(
  row: Record<string, unknown>,
  labelByCode: Record<number, string> = {}
): string {
  const pct = resolveAllocatedPercentFromRow(row);
  if (pct == null) return "—";
  return labelByCode[pct] ?? `${pct}%`;
}

export function isKnownAllocationPercent(
  code: string,
  types: AllocationPercentRow[]
): boolean {
  const n = Number(code);
  if (!Number.isFinite(n) || n <= 0) return false;
  return types.some((t) => Math.abs(t.code - n) < 0.01);
}

export function fineAllocationPercentOptions(): AllocationPercentRow[] {
  return fallbackAllocationPercentOptions("Senior Designer");
}

export const ALL_ALLOCATION_PERCENT_LABELS: AllocationPercentRow[] = [
  { code: 25, label: "25%", sortOrder: 1 },
  { code: 50, label: "50%", sortOrder: 2 },
  { code: 75, label: "75%", sortOrder: 3 },
  { code: 100, label: "100%", sortOrder: 4 },
];
