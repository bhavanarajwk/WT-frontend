/** Format leave balance values for summary cards. */
export function formatBalanceDays(value: number | string | null | undefined): {
  amount: string;
  unit: string;
} {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed)) return { amount: "0", unit: "days" };
  const amount = Number.isInteger(parsed) ? String(parsed) : String(Number(parsed.toFixed(1)));
  return { amount, unit: parsed === 1 ? "day" : "days" };
}

import { formatApiDateDisplay } from "@/utils/apiDate";
import { calendarDaysInclusive } from "@/utils/compOff";

export function formatLeaveDateRange(
  fromDate: unknown,
  toDate: unknown,
  isHalfDay?: boolean
): string {
  const from = formatApiDateDisplay(String(fromDate ?? "").trim()) || "—";
  const to = formatApiDateDisplay(String(toDate ?? "").trim()) || "—";
  if (from === to) return from;
  return `${from} – ${to}`;
}

export function formatLeaveDaysCount(
  fromDate: string,
  toDate: string,
  isHalfDay?: boolean
): string {
  if (isHalfDay) return "0.5";
  const days = calendarDaysInclusive(fromDate, toDate);
  if (days <= 0) return "—";
  return String(days);
}
