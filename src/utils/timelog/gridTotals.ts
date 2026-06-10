export const DAILY_HOUR_HIGH_THRESHOLD = 10;
export const DAILY_HOUR_LOW_THRESHOLD = 4;

export type DailyHourHighlight = "high" | "low" | null;

export function parseHourInput(value: string): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function sumHours(values: Array<string | number>): number {
  return values.reduce<number>((acc, v) => acc + parseHourInput(String(v)), 0);
}

export function rowTotal(hoursByDate: Record<string, string>, dayKeys: string[]): number {
  return sumHours(dayKeys.map((k) => hoursByDate[k] ?? ""));
}

export function dailyTotals(
  rows: Array<{ hours_by_date: Record<string, string> }>,
  dayKeys: string[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of dayKeys) {
    out[key] = sumHours(rows.map((r) => r.hours_by_date[key] ?? ""));
  }
  return out;
}

export function weeklyTotal(daily: Record<string, number>): number {
  return Object.values(daily).reduce((a, b) => a + b, 0);
}

export function dailyHourHighlight(total: number): DailyHourHighlight {
  if (!Number.isFinite(total) || total <= 0) return null;
  if (total >= DAILY_HOUR_HIGH_THRESHOLD) return "high";
  if (total < DAILY_HOUR_LOW_THRESHOLD) return "low";
  return null;
}

export function dailyHourHighlightClass(highlight: DailyHourHighlight): string {
  if (highlight === "high") return "bg-amber-100 text-amber-900";
  if (highlight === "low") return "bg-sky-100 text-sky-900";
  return "";
}
