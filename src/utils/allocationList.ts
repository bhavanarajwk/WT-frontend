import { toRows } from "@/utils/apiRows";
import { formatApiDate, normalizeToApiDate, parseApiDate } from "@/utils/apiDate";

const DEALLOCATED_STATUS_EXACT = new Set([
  "DEALLOCATED",
  "DE_ALLOCATED",
  "ENDED",
  "INACTIVE",
  "TERMINATED",
  "CLOSED",
  "COMPLETED",
  "CANCELLED",
  "CANCELED",
]);

export function allocationRowId(row: Record<string, unknown>): string {
  return String(row.id ?? row.allocation_id ?? row.allocationId ?? "").trim();
}

/** Normalized allocation row status from GET /allocation. */
export function allocationRowStatus(row: Record<string, unknown>): string {
  return String(
    row.allocation_status ??
      row.allocationStatus ??
      row.status ??
      row.allocation_state ??
      row.allocationState ??
      ""
  )
    .trim()
    .toUpperCase();
}

/** `recordStatus` from GET /allocation (ACTIVE | SUPERSEDED | DEALLOCATED). */
export function allocationRecordStatus(row: Record<string, unknown>): string {
  return String(row.record_status ?? row.recordStatus ?? "")
    .trim()
    .toUpperCase();
}

/** Grey row: superseded history kept in main list when includeSuperseded=true. */
export function isSupersededAllocationRow(row: Record<string, unknown>): boolean {
  if (allocationRecordStatus(row) === "SUPERSEDED") return true;
  const replacedBy = row.replaced_by_allocation_id ?? row.replacedByAllocationId;
  const hasReplacement =
    replacedBy != null && replacedBy !== "" && Number(replacedBy) > 0;
  if (!hasReplacement) return false;
  const isActive = row.is_active ?? row.isActive;
  return isActive === false || isActive === "false" || isActive === 0 || isActive === "0";
}

/** Only ACTIVE rows can be edited or soft-deleted from the main list. */
export function isEditableAllocationRow(row: Record<string, unknown>): boolean {
  if (isSupersededAllocationRow(row)) return false;
  if (allocationRecordStatus(row) === "DEALLOCATED") return false;
  return true;
}

export function sortAllocationListRows(
  rows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return [...rows].sort((a, b) => {
    const aSup = isSupersededAllocationRow(a) ? 1 : 0;
    const bSup = isSupersededAllocationRow(b) ? 1 : 0;
    if (aSup !== bSup) return aSup - bSup;

    const nameA = String(a.employee_name ?? a.employeeName ?? "").toLowerCase();
    const nameB = String(b.employee_name ?? b.employeeName ?? "").toLowerCase();
    const byName = nameA.localeCompare(nameB);
    if (byName !== 0) return byName;

    const startA = parseApiDate(String(a.start_date ?? a.startDate ?? ""))?.getTime() ?? 0;
    const startB = parseApiDate(String(b.start_date ?? b.startDate ?? ""))?.getTime() ?? 0;
    return startA - startB;
  });
}

export type AllocationUpdateResponse = {
  allocation: Record<string, unknown>;
  previousAllocation: Record<string, unknown>;
};

/** PUT /allocation/{id} — new active row + superseded previous row. */
export function parseAllocationUpdateResponse(res: unknown): AllocationUpdateResponse | null {
  const data = (res as { data?: unknown })?.data ?? res;
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const allocation = o.allocation;
  if (!allocation || typeof allocation !== "object") return null;
  const previous = o.previousAllocation ?? o.previous_allocation;
  return {
    allocation: allocation as Record<string, unknown>,
    previousAllocation:
      previous && typeof previous === "object"
        ? (previous as Record<string, unknown>)
        : {},
  };
}

/** Merge PUT response into list before refetch (optional optimistic update). */
export function mergeAllocationListAfterUpdate(
  rows: Array<Record<string, unknown>>,
  update: AllocationUpdateResponse,
  editedAllocationId: string
): Array<Record<string, unknown>> {
  const prevId =
    allocationRowId(update.previousAllocation) || editedAllocationId.trim();
  const newId = allocationRowId(update.allocation);

  let next = rows.map((row) => {
    const id = allocationRowId(row);
    if (id && id === prevId) {
      return {
        ...row,
        ...update.previousAllocation,
        recordStatus: "SUPERSEDED",
        record_status: "SUPERSEDED",
        isActive: false,
        is_active: false,
      };
    }
    if (newId && id === newId) {
      return { ...row, ...update.allocation };
    }
    return row;
  });

  if (prevId && !next.some((r) => allocationRowId(r) === prevId)) {
    next = [
      ...next,
      {
        ...update.previousAllocation,
        recordStatus: "SUPERSEDED",
        record_status: "SUPERSEDED",
      },
    ];
  }

  if (newId && !next.some((r) => allocationRowId(r) === newId)) {
    next = [...next, update.allocation];
  }

  return sortAllocationListRows(next);
}

/** True when the row represents a ended/deallocated assignment (client filter on GET /allocation). */
export function isDeallocatedAllocationRow(
  row: Record<string, unknown>,
  referenceDate: Date = new Date()
): boolean {
  const status = allocationRowStatus(row);
  if (DEALLOCATED_STATUS_EXACT.has(status)) return true;
  if (
    status.includes("DEALLOC") ||
    status.includes("ENDED") ||
    status.includes("INACTIVE") ||
    status.includes("TERMINAT")
  ) {
    return true;
  }

  const activeRaw = row.active ?? row.is_active ?? row.isActive;
  if (activeRaw === false || activeRaw === "false" || activeRaw === 0 || activeRaw === "0") {
    return true;
  }

  const deallocatedFlag = row.deallocated ?? row.is_deallocated ?? row.isDeallocated;
  if (deallocatedFlag === true || deallocatedFlag === "true" || deallocatedFlag === 1) {
    return true;
  }

  const endRaw = String(
    row.end_date ??
      row.endDate ??
      row.deallocated_at ??
      row.deallocatedAt ??
      row.deallocation_date ??
      row.deallocationDate ??
      ""
  ).trim();
  const endDate = parseApiDate(endRaw);
  if (endDate) {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    return endDate.getTime() <= today.getTime();
  }

  return false;
}

export function partitionAllocationListRows(rows: Array<Record<string, unknown>>): {
  active: Array<Record<string, unknown>>;
  deallocated: Array<Record<string, unknown>>;
} {
  const active: Array<Record<string, unknown>> = [];
  const deallocated: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    if (isDeallocatedAllocationRow(row)) deallocated.push(row);
    else active.push(row);
  }
  return { active, deallocated };
}

/** Mark a row deallocated locally (e.g. after DELETE when API no longer returns it). */
export function markAllocationRowDeallocated(
  row: Record<string, unknown>,
  at: Date = new Date()
): Record<string, unknown> {
  const endToday = formatApiDate(at);
  const existingEnd = String(row.end_date ?? row.endDate ?? "").trim();
  const endDisplay = existingEnd ? normalizeToApiDate(existingEnd) || endToday : endToday;
  return {
    ...row,
    allocation_status: "DEALLOCATED",
    allocationStatus: "DEALLOCATED",
    status: "DEALLOCATED",
    active: false,
    is_active: false,
    isActive: false,
    deallocated: true,
    end_date: endDisplay,
    endDate: endDisplay,
    deallocated_at: endToday,
    deallocatedAt: endToday,
  };
}

export function isAllocationEndDateOnOrBeforeToday(
  endDate: string | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  const normalized = normalizeToApiDate(String(endDate ?? "").trim());
  if (!normalized) return false;
  const end = parseApiDate(normalized);
  if (!end) return false;
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  return end.getTime() <= today.getTime();
}

/** Parse GET /allocation and GET /allocation/active-non-bench list payloads. */
export function parseAllocationListRows(data: unknown): Array<Record<string, unknown>> {  if (!data || typeof data !== "object") return [];
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

/** Parse GET /allocation/deallocated — data.allocations[] */
export function parseDeallocatedAllocationListRows(data: unknown): Array<Record<string, unknown>> {
  return parseAllocationListRows(data);
}

export type EmployeeAllocationsData = {
  employeeEmail: string;
  employeeName: string;
  userId?: number;
  empId?: string;
  totalElements: number;
  totalAllocatedPercent: number;
  allocations: Array<Record<string, unknown>>;
};

/** Parse GET /allocation/employee — data.allocations[]. */
export function parseEmployeeAllocationsResponse(res: unknown): EmployeeAllocationsData | null {
  const raw = (res as { data?: unknown })?.data ?? res;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const allocations = Array.isArray(o.allocations)
    ? (o.allocations as Array<Record<string, unknown>>)
    : [];
  const employeeEmail = String(o.employee_email ?? o.employeeEmail ?? "").trim();
  const employeeName = String(o.employee_name ?? o.employeeName ?? "").trim();
  const userIdRaw = o.user_id ?? o.userId;
  const userId =
    userIdRaw !== undefined && userIdRaw !== null && userIdRaw !== ""
      ? Number(userIdRaw)
      : undefined;
  const empId = String(o.emp_id ?? o.empId ?? "").trim() || undefined;
  const totalRaw = o.total_elements ?? o.totalElements ?? allocations.length;
  const totalElements = Number(totalRaw);
  const totalPercentRaw = o.total_allocated_percent ?? o.totalAllocatedPercent ?? 0;
  const totalAllocatedPercent = Number(totalPercentRaw);
  return {
    employeeEmail,
    employeeName,
    userId: Number.isFinite(userId) ? userId : undefined,
    empId,
    totalElements: Number.isFinite(totalElements) ? totalElements : allocations.length,
    totalAllocatedPercent: Number.isFinite(totalAllocatedPercent) ? totalAllocatedPercent : 0,
    allocations,
  };
}

export function allocationTimingLabel(row: Record<string, unknown>, todayIso?: string): "Current" | "Future" {
  const today = todayIso ?? new Date().toISOString().slice(0, 10);
  const start = String(row.start_date ?? row.startDate ?? today).slice(0, 10);
  return start > today ? "Future" : "Current";
}

/** Row returned by DELETE /allocation/{id} (soft-deallocated). */
export function parseDeallocatedAllocationDeleteResponse(
  res: unknown
): Record<string, unknown> | null {
  const data = (res as { data?: unknown })?.data ?? res;
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const email = String(o.employeeEmail ?? o.employee_email ?? "").trim();
  if (email) return o;
  const nested = parseAllocationListRows(o);
  return nested.length === 1 ? nested[0]! : null;
}
