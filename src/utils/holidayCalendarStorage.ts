import type { HolidayCalendarRow } from "@/utils/holidayCalendarTable";
import { yearsFromHolidayRows } from "@/utils/holidayCalendarTable";

export const HOLIDAY_CALENDAR_STORAGE_PREFIX = "holiday-calendars";
export const HOLIDAY_CALENDAR_FILE_EXTENSIONS = [".xlsx", ".xls", ".csv"] as const;

export type HolidayCalendarFileExtension = (typeof HOLIDAY_CALENDAR_FILE_EXTENSIONS)[number];

export function extractYearFromFileName(fileName: string): number | null {
  const match = fileName.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

export function resolveHolidayCalendarExtension(fileName: string): HolidayCalendarFileExtension {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx")) return ".xlsx";
  if (lower.endsWith(".xls")) return ".xls";
  return ".csv";
}

export function holidayCalendarStorageFileName(
  year: number,
  extension: HolidayCalendarFileExtension
): string {
  return `holiday_calendar_${year}${extension}`;
}

export function holidayCalendarObjectKey(
  year: number,
  extension: HolidayCalendarFileExtension
): string {
  return `${HOLIDAY_CALENDAR_STORAGE_PREFIX}/${holidayCalendarStorageFileName(year, extension)}`;
}

export function resolveHolidayCalendarUploadYear(
  fileName: string,
  rows: HolidayCalendarRow[],
  currentYear: number
): number {
  const fromFileName = extractYearFromFileName(fileName);
  if (fromFileName != null) return fromFileName;

  const fromData = yearsFromHolidayRows(rows);
  if (fromData.length === 1) return fromData[0];
  if (fromData.includes(currentYear)) return currentYear;
  if (fromData.length) return fromData[0];

  return currentYear;
}

export function extractYearFromObjectKey(key: string): number | null {
  const fileName = key.split("/").pop() ?? key;
  const match = fileName.match(/^holiday_calendar_(\d{4})\./i);
  return match ? Number(match[1]) : null;
}
