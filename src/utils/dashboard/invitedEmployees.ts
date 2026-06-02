import {
  compareApiDates,
  formatApiDate,
  formatApiDateTimeDisplay,
  parseApiDate,
} from "@/utils/apiDate";

export const INVITED_LIST_DEFAULT_DAYS = 7;

export function defaultInvitedEmployeesDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - INVITED_LIST_DEFAULT_DAYS);
  return { from: formatApiDate(from), to: formatApiDate(to) };
}

export function invitedRowCreatedAtApiDate(row: Record<string, unknown>): string | null {
  const raw = String(row.created_at ?? row.createdAt ?? "").trim();
  if (!raw) return null;
  const parsed = parseApiDate(raw);
  return parsed ? formatApiDate(parsed) : null;
}

/** Client-side guard when API returns rows outside the selected created_at range. */
export function filterInvitedRowsByCreatedAtRange(
  rows: Array<Record<string, unknown>>,
  from: string,
  to: string
): Array<Record<string, unknown>> {
  return rows.filter((row) => {
    const day = invitedRowCreatedAtApiDate(row);
    if (!day) return false;
    return compareApiDates(day, from) >= 0 && compareApiDates(day, to) <= 0;
  });
}

export function formatInvitedEmployeeTableRows(
  rows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const createdRaw = String(row.created_at ?? row.createdAt ?? "").trim();
    const createdDisplay = createdRaw ? formatApiDateTimeDisplay(createdRaw) : "—";
    return { ...row, created_at: createdDisplay };
  });
}

export function allocationAccManagerCell(row: Record<string, unknown>): string {
  const v =
    row.acc_manager ??
    row.accManager ??
    row.account_manager ??
    row.accountManager ??
    row.account_mgr ??
    row.accountMgr;
  const s = String(v ?? "").trim();
  return s || "—";
}
