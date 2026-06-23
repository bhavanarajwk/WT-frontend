import {
  compareApiDates,
  formatApiDate,
  formatApiDateDisplay,
  parseApiDate,
} from "@/utils/apiDate";
import { resolveEmployeeNameFromRow } from "@/utils/tableDisplay";

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

/** Client-side name filter for invited employees list. */
export function filterInvitedRowsByName(
  rows: Array<Record<string, unknown>>,
  query: string
): Array<Record<string, unknown>> {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => {
    const name = resolveEmployeeNameFromRow(row).toLowerCase();
    if (name === "—") return false;
    return name.includes(needle);
  });
}

export function canResendOnboardInvite(status: unknown): boolean {
  const normalized = String(status ?? "").trim().toUpperCase();
  return normalized === "INVITED" || normalized === "ONBOARDING";
}

export function invitedEmployeeWorkEmail(row: Record<string, unknown>): string {
  return String(row.email ?? row.work_email ?? row.workEmail ?? "").trim().toLowerCase();
}

export function isResendableInvitedEmployeeRow(row: Record<string, unknown>): boolean {
  const email = invitedEmployeeWorkEmail(row);
  return Boolean(email) && canResendOnboardInvite(row.status);
}

export function resendableInvitedEmployeeEmails(
  rows: Array<Record<string, unknown>>
): string[] {
  return rows
    .filter(isResendableInvitedEmployeeRow)
    .map((row) => invitedEmployeeWorkEmail(row));
}

const MAX_BULK_RESEND_SELECTION = 100;

export function mergeEmailSelection(current: string[], nextEmails: string[]): string[] {
  const merged = new Set(current);
  for (const email of nextEmails) {
    if (merged.size >= MAX_BULK_RESEND_SELECTION) break;
    const normalized = email.trim().toLowerCase();
    if (normalized) merged.add(normalized);
  }
  return Array.from(merged);
}

export function formatInvitedEmployeeTableRows(
  rows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const createdRaw = String(row.created_at ?? row.createdAt ?? "").trim();
    const createdOn = createdRaw ? formatApiDateDisplay(createdRaw) : "—";
    return { ...row, created_on: createdOn };
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
