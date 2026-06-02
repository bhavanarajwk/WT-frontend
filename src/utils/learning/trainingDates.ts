import { compareApiDates, parseApiDate } from "@/utils/apiDate";

export function trainingDurationDaysFromRange(startDate: string, endDate: string): number {
  const start = parseApiDate(startDate);
  const end = parseApiDate(endDate);
  if (!start || !end || compareApiDates(startDate, endDate) > 0) return NaN;
  const msPerDay = 86400000;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);
}
