export const INVITED_LIST_DEFAULT_DAYS = 7;

export function formatDateInputYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultInvitedEmployeesDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - INVITED_LIST_DEFAULT_DAYS);
  return { from: formatDateInputYmd(from), to: formatDateInputYmd(to) };
}

export function invitedRowCreatedAtYmd(row: Record<string, unknown>): string | null {
  const raw = String(row.created_at ?? row.createdAt ?? "").trim();
  if (!raw) return null;
  return raw.includes("T") ? raw.slice(0, 10) : raw.slice(0, 10);
}

/** Client-side guard when API returns rows outside the selected created_at range. */
export function filterInvitedRowsByCreatedAtRange(
  rows: Array<Record<string, unknown>>,
  from: string,
  to: string
): Array<Record<string, unknown>> {
  return rows.filter((row) => {
    const day = invitedRowCreatedAtYmd(row);
    if (!day) return false;
    return day >= from && day <= to;
  });
}

export function formatInvitedEmployeeTableRows(
  rows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const createdRaw = String(row.created_at ?? row.createdAt ?? "").trim();
    const createdDisplay = createdRaw
      ? createdRaw.includes("T")
        ? createdRaw.slice(0, 10)
        : createdRaw.slice(0, 19)
      : "—";
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
