/** API canonical date: dd/mm/yyyy. Date-time: dd/mm/yyyy HH:MM:SS */

const SLASH_DMY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const DASH_DMY = /^(\d{2})-(\d{2})-(\d{4})$/;

function dateFromParts(day: number, month: number, year: number): Date | null {
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parse API date, ISO yyyy-mm-dd, or dash dmy dd-mm-yyyy (and date part of datetimes). */
export function parseApiDate(value: string | null | undefined): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const datePart = raw.includes(" ") ? raw.split(/\s+/)[0] ?? "" : raw;
  if (!datePart) return null;

  let match = SLASH_DMY.exec(datePart);
  if (match) {
    return dateFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  match = ISO_YMD.exec(datePart);
  if (match) {
    return dateFromParts(Number(match[3]), Number(match[2]), Number(match[1]));
  }

  match = DASH_DMY.exec(datePart);
  if (match) {
    return dateFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  return null;
}

export function formatApiDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function formatApiDateTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${formatApiDate(date)} ${h}:${min}:${s}`;
}

/** Convert stored/API date to `yyyy-mm-dd` for `<input type="date">`. */
export function apiDateToInputValue(apiValue: string): string {
  const parsed = parseApiDate(apiValue);
  if (!parsed) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Convert `<input type="date">` value to API `dd/mm/yyyy`. */
export function inputValueToApiDate(isoValue: string): string {
  const trimmed = isoValue.trim();
  if (!trimmed) return "";
  const parsed = parseApiDate(trimmed);
  return parsed ? formatApiDate(parsed) : "";
}

/** Normalize any accepted input to canonical `dd/mm/yyyy`, or empty if unparseable. */
export function normalizeToApiDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = parseApiDate(trimmed);
  return parsed ? formatApiDate(parsed) : "";
}

export function formatApiDateDisplay(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "—") return trimmed || "—";
  const parsed = parseApiDate(trimmed);
  return parsed ? formatApiDate(parsed) : trimmed;
}

export function compareApiDates(a: string, b: string): number {
  const da = parseApiDate(a);
  const db = parseApiDate(b);
  if (!da && !db) return 0;
  if (!da) return -1;
  if (!db) return 1;
  return da.getTime() - db.getTime();
}

export function todayApiDate(): string {
  return formatApiDate(new Date());
}

export function isValidApiDate(value: string): boolean {
  return parseApiDate(value) !== null;
}

export const API_DATE_PLACEHOLDER = "dd/mm/yyyy";

/** Mask digits while typing toward dd/mm/yyyy. */
export function maskApiDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Normalize on blur; keeps partial input if not yet complete. */
export function finalizeApiDateInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const masked = maskApiDateInput(trimmed);
  if (masked.length === 10 && isValidApiDate(masked)) {
    return normalizeToApiDate(masked);
  }
  const normalized = normalizeToApiDate(trimmed);
  return normalized || masked;
}

/** Value suitable for a dd/mm/yyyy text input. */
export function apiDateFieldValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isValidApiDate(trimmed)) return normalizeToApiDate(trimmed);
  return maskApiDateInput(trimmed);
}

/** Contract alias — format a `Date` as `dd/mm/yyyy`. */
export const toApiDate = formatApiDate;

/** Contract alias — parse `dd/mm/yyyy` (or accepted legacy input) to local `Date`. */
export function fromApiDate(value: string): Date {
  const parsed = parseApiDate(value);
  if (!parsed) {
    throw new Error(`Invalid API date: ${value}`);
  }
  return parsed;
}

/** Normalize for query/path/body; returns `undefined` when empty or unparseable. */
export function toApiDateParam(value: string | null | undefined): string | undefined {
  const normalized = normalizeToApiDate(String(value ?? "").trim());
  return normalized || undefined;
}

export function applyApiDateQuery(
  query: Record<string, string>,
  keys: readonly string[]
): Record<string, string> {
  const out = { ...query };
  for (const key of keys) {
    if (out[key]) {
      const normalized = toApiDateParam(out[key]);
      if (normalized) out[key] = normalized;
    }
  }
  return out;
}

export function applyApiDateFields(
  body: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const out = { ...body };
  for (const key of keys) {
    if (typeof out[key] === "string") {
      const normalized = toApiDateParam(out[key] as string);
      if (normalized) out[key] = normalized;
    }
  }
  return out;
}

export const ONBOARD_DATE_FIELDS = ["date_of_birth", "doj", "doi"] as const;

export const API_QUERY_DATE_KEYS = [
  "fromDate",
  "toDate",
  "startDate",
  "endDate",
  "asOfDate",
  "as_of",
  "as_of_date",
  "logDate",
] as const;

export function formatApiDateTimeDisplay(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "—") return trimmed || "—";
  if (trimmed.includes(" ")) {
    const [datePart, ...timeParts] = trimmed.split(/\s+/);
    const parsed = parseApiDate(datePart);
    if (parsed && timeParts.length) {
      return `${formatApiDate(parsed)} ${timeParts.join(" ")}`;
    }
  }
  return formatApiDateDisplay(trimmed);
}
