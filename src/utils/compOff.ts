import { ApiError } from "@/api/error";
import type { CompOffGrant, CompOffRequestType } from "@/types/compOff";

export const COMP_OFF_EARN_ALIASES = [
  "COMP_OFF_EARN",
  "COMP_OFF_EARNED",
  "COMPOFF_EARN",
  "COMP-OFF-EARN",
] as const;

export const COMP_OFF_USAGE_ALIASES = [
  "COMP_OFF",
  "COMPOFF",
  "COMP-OFF",
  "COMP OFF",
] as const;

/** Types used in list/create API paths — backend expects these exact values. */
export const COMP_OFF_EARN_LIST_TYPE = "COMP_OFF_EARN";
export const COMP_OFF_USAGE_LIST_TYPE = "COMP_OFF";

export function normalizeCompOffRequestType(value: unknown): CompOffRequestType | null {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (COMP_OFF_EARN_ALIASES.some((a) => raw === a.replace(/[\s-]+/g, "_"))) {
    return "COMP_OFF_EARN";
  }
  if (COMP_OFF_USAGE_ALIASES.some((a) => raw === a.replace(/[\s-]+/g, "_"))) {
    return "COMP_OFF";
  }
  return null;
}

export function isCompOffRequestType(value: unknown): boolean {
  return normalizeCompOffRequestType(value) !== null;
}

/** Inclusive calendar days between ISO dates (UTC midnight). */
export function calendarDaysInclusive(fromYmd: string, toYmd: string): number {
  const fromMs = Date.parse(fromYmd);
  const toMs = Date.parse(toYmd);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs < fromMs) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((toMs - fromMs) / msPerDay) + 1;
}

export function addDaysIso(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when ISO date falls on Saturday/Sunday. */
export function isWeekendYmd(ymd: string): boolean {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function pickRowField<T = unknown>(
  row: Record<string, unknown>,
  ...keys: string[]
): T | undefined {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return v as T;
    }
  }
  return undefined;
}

export function requestRowId(row: Record<string, unknown>): string {
  return String(
    pickRowField(row, "user_request_id", "userRequestId", "request_id", "requestId", "id") ?? ""
  ).trim();
}

export type CompOffRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Normalize API variants (APPROVE, APPROVED, etc.) to display/action status. */
export function normalizeRequestStatus(value: unknown): CompOffRequestStatus | string {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!raw) return "PENDING";
  if (raw === "APPROVE" || raw === "APPROVED") return "APPROVED";
  if (raw === "REJECT" || raw === "REJECTED") return "REJECTED";
  if (raw === "PENDING") return "PENDING";
  return raw;
}

export function requestRowStatus(row: Record<string, unknown>): string {
  return normalizeRequestStatus(
    pickRowField(row, "user_request_status", "userRequestStatus", "status")
  );
}

export function isPendingRequestStatus(status: unknown): boolean {
  return normalizeRequestStatus(status) === "PENDING";
}

export function patchRequestRowStatus(
  row: Record<string, unknown>,
  status: CompOffRequestStatus
): Record<string, unknown> {
  return {
    ...row,
    status,
    user_request_status: status,
    userRequestStatus: status,
  };
}

/** True when PUT /userRequest/status indicates the request was already acted on. */
export function isAlreadyActedOnRequestError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const payload = error.payload;
  const detail =
    payload && typeof payload === "object" && "detail" in payload
      ? String((payload as { detail?: unknown }).detail ?? "")
      : "";
  const combined = `${error.message} ${detail}`.toLowerCase();
  return combined.includes("already") && (combined.includes("approv") || combined.includes("reject"));
}

export function inferStatusFromAlreadyActedError(error: unknown): CompOffRequestStatus | null {
  if (!isAlreadyActedOnRequestError(error)) return null;
  const payload = error.payload;
  const detail =
    payload && typeof payload === "object" && "detail" in payload
      ? String((payload as { detail?: unknown }).detail ?? "")
      : "";
  const combined = `${error instanceof ApiError ? error.message : ""} ${detail}`.toLowerCase();
  if (combined.includes("reject")) return "REJECTED";
  if (combined.includes("approv")) return "APPROVED";
  return null;
}

/** Apply session decisions when list GET still returns PENDING. */
export function applyTeamRequestDecisions(
  rows: Array<Record<string, unknown>>,
  decisions: ReadonlyMap<string, CompOffRequestStatus>
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const id = requestRowId(row);
    const decision = id ? decisions.get(id) : undefined;
    if (!decision) return row;
    const serverStatus = normalizeRequestStatus(requestRowStatus(row));
    if (serverStatus === "APPROVED" || serverStatus === "REJECTED") return row;
    return patchRequestRowStatus(row, decision);
  });
}

export function effectiveRequestRowStatus(
  row: Record<string, unknown>,
  decisions: Readonly<Record<string, CompOffRequestStatus>>
): CompOffRequestStatus | string {
  const id = requestRowId(row);
  const server = normalizeRequestStatus(requestRowStatus(row));
  if (id && decisions[id] && server === "PENDING") return decisions[id];
  return server;
}

export function dedupeCompOffRequestRows(
  rows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return Array.from(
    new Map(
      rows.map((row) => {
        const key = requestRowId(row);
        return [key || `row-${Math.random()}`, row] as const;
      })
    ).values()
  ).filter((row) => Boolean(requestRowId(row)));
}

export function grantWorkedDate(grant: CompOffGrant): string {
  return String(grant.worked_date ?? grant.workedDate ?? "").trim();
}

export function grantExpiryDate(grant: CompOffGrant): string {
  return String(grant.expiry_date ?? grant.expiryDate ?? "").trim();
}

export function grantRemainingUnits(grant: CompOffGrant): number {
  const n = Number(grant.remaining_units ?? grant.remainingUnits ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function grantStatus(grant: CompOffGrant): string {
  return String(grant.status ?? "").trim().toUpperCase();
}

/** Sort grants FIFO: oldest expiry first, then worked date. */
export function sortGrantsFifo(grants: CompOffGrant[]): CompOffGrant[] {
  return [...grants].sort((a, b) => {
    const expA = grantExpiryDate(a);
    const expB = grantExpiryDate(b);
    if (expA && expB && expA !== expB) return expA.localeCompare(expB);
    return grantWorkedDate(a).localeCompare(grantWorkedDate(b));
  });
}

export function availableUnitsFromGrants(grants: CompOffGrant[], asOfYmd: string): number {
  const asOf = asOfYmd.trim();
  return grants
    .filter((g) => grantStatus(g) === "ACTIVE")
    .filter((g) => {
      const exp = grantExpiryDate(g);
      return !exp || exp >= asOf;
    })
    .reduce((sum, g) => sum + grantRemainingUnits(g), 0);
}
