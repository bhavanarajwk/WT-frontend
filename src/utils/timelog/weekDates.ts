/** Monday of the week containing `value`. */
export function normalizeWeekStart(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function weekDaysMonFri(weekStart: Date): Date[] {
  const monday = normalizeWeekStart(weekStart);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function formatApiDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDayHeader(value: Date): string {
  return value.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function shiftWeekStart(weekStart: Date, deltaWeeks: number): Date {
  const d = normalizeWeekStart(weekStart);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return d;
}

export function weekRangeLabel(weekStart: Date): string {
  const days = weekDaysMonFri(weekStart);
  const start = days[0].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const end = days[4].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${start} – ${end}`;
}
