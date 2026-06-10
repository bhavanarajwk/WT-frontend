import { formatApiDate, normalizeWeekStart } from "@/utils/timelog/weekDates";

export type MonthRef = { year: number; month: number };

export function currentMonthRef(): MonthRef {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const d = new Date(ref.year, ref.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function formatMonthYearLabel(ref: MonthRef): string {
  return new Date(ref.year, ref.month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** Monday week starts that fall inside the calendar month (Mon–Fri weeks per API). */
export function weekStartsInMonth(ref: MonthRef): string[] {
  const mondays: string[] = [];
  const cursor = new Date(ref.year, ref.month, 1);
  const monthIndex = ref.month;

  while (cursor.getMonth() === monthIndex) {
    if (cursor.getDay() === 1) {
      mondays.push(formatApiDate(normalizeWeekStart(cursor)));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return mondays;
}

export function weekColumnLabel(index: number): string {
  return `Week ${index + 1}`;
}

export function formatSummaryHours(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}
