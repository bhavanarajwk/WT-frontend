/** Parse API date strings: dd/mm/yyyy, dd-mm-yyyy, or yyyy-mm-dd. */
export function parseTimelogDate(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/** Normalize any API date string to yyyy-mm-dd (hours_by_date keys). */
export function toIsoDateKey(value: string): string {
  const parsed = parseTimelogDate(value);
  return parsed ? formatApiDate(parsed) : value.trim();
}

/** Monday of the week containing `value`. */
export function normalizeWeekStart(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Monday through Sunday (7 days) for the timelog grid. */
export function weekDaysMonSun(weekStart: Date): Date[] {
  const monday = normalizeWeekStart(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** @deprecated Use weekDaysMonSun */
export function weekDaysMonFri(weekStart: Date): Date[] {
  return weekDaysMonSun(weekStart);
}

export function formatApiDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Compact column header, e.g. 9/6 for 9 June. */
export function formatDayHeader(value: Date): string {
  return `${value.getDate()}/${value.getMonth() + 1}`;
}

/** Team timelog table date cell, e.g. 09/06/26. */
export function formatTimelogTableDate(value: Date): string {
  const d = String(value.getDate()).padStart(2, "0");
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const y = String(value.getFullYear()).slice(-2);
  return `${d}/${m}/${y}`;
}

export function formatHoursDisplay(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

export function shiftWeekStart(weekStart: Date, deltaWeeks: number): Date {
  const d = normalizeWeekStart(weekStart);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return d;
}

export function weekRangeLabel(weekStart: Date): string {
  const days = weekDaysMonSun(weekStart);
  const start = days[0].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const end = days[6].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${start} – ${end}`;
}
