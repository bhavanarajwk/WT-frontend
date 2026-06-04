import type { SelectFieldOption } from "@/components/dashboard/ui/forms";
import type { AllocationPercentRow } from "@/types/allocationPercent";
import { toRows } from "@/utils/apiRows";

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

/** 12.5% steps from 12.5 through 100 (designer / tester / PM). */
export const FINE_ALLOCATION_PERCENT_STEP = 12.5;

/** Designers, testers, and project managers use 12.5% increments up to 100%. */
export function designationAllowsFineAllocationPercent(designation: string): boolean {
  const r = designation.trim().toLowerCase();
  if (!r) return false;
  return (
    r.includes("design") ||
    r.includes("test") ||
    r.includes("project manager") ||
    /\bpm\b/.test(r)
  );
}

export function fineAllocationPercentOptions(): AllocationPercentRow[] {
  const rows: AllocationPercentRow[] = [];
  for (let pct = FINE_ALLOCATION_PERCENT_STEP; pct <= 100.001; pct += FINE_ALLOCATION_PERCENT_STEP) {
    const code = Math.round(pct * 10) / 10;
    rows.push({
      code,
      label: `${code}%`,
      sortOrder: rows.length + 1,
    });
  }
  return rows;
}

export function allocationPercentOptionsForDesignation(
  designation: string,
  apiOptions: AllocationPercentRow[]
): AllocationPercentRow[] {
  if (designationAllowsFineAllocationPercent(designation)) {
    return fineAllocationPercentOptions();
  }
  return apiOptions;
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
  if (hours === 50 || hours === 100) return hours;
  if (Number.isInteger(hours) && hours >= 1 && hours <= 8) {
    return hours * FINE_ALLOCATION_PERCENT_STEP;
  }
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
