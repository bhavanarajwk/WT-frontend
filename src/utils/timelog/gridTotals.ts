export const DAILY_HOUR_WARNING_THRESHOLD = 8;

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

export function isDailyOverThreshold(total: number): boolean {
  return total > DAILY_HOUR_WARNING_THRESHOLD;
}
