import type { ParsedSpreadsheet, SpreadsheetRow } from "@/utils/parseSpreadsheetFile";

export const HOLIDAY_CALENDAR_COLUMNS = [
  { key: "sl_no", label: "Sl. No." },
  { key: "date", label: "Date" },
  { key: "day", label: "Day" },
  { key: "holiday", label: "Holiday" },
  { key: "optional", label: "Optional" },
] as const;

export type HolidayCalendarColumnKey = (typeof HOLIDAY_CALENDAR_COLUMNS)[number]["key"];

export type HolidayCalendarRow = Record<HolidayCalendarColumnKey, string>;

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const HEADER_ALIASES: Record<HolidayCalendarColumnKey, string[]> = {
  sl_no: ["sl. no.", "sl no", "sl.no.", "slno", "sl no.", "serial no", "serial number", "sno", "sr no", "sl. no"],
  date: ["date", "holiday date", "holiday_date"],
  day: ["day", "weekday", "day of week"],
  holiday: ["holiday", "name", "holiday name"],
  optional: ["optional", "is_optional", "optional note", "optional with"],
};

const HEADER_MATCHERS: Record<HolidayCalendarColumnKey, (header: string) => boolean> = {
  sl_no: (header) => /\bsl\.?\s*no\b/.test(header) || header.includes("serial") || header === "sno",
  date: (header) => header.includes("date"),
  day: (header) => header === "day" || header.includes("weekday") || header.includes("day of week"),
  holiday: (header) => header.includes("holiday") || header === "name" || header === "holiday name",
  optional: (header) => header.includes("optional"),
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[._]+/g, " ").replace(/\s+/g, " ");
}

function resolveSourceColumn(
  columns: string[],
  key: HolidayCalendarColumnKey
): string | null {
  const aliases = new Set(HEADER_ALIASES[key]);
  for (const column of columns) {
    const normalized = normalizeHeader(column);
    if (aliases.has(normalized) || HEADER_MATCHERS[key](normalized)) {
      return column;
    }
  }
  return null;
}

function resolveSourceColumns(columns: string[]): Record<HolidayCalendarColumnKey, string | null> {
  const sourceByKey = Object.fromEntries(
    HOLIDAY_CALENDAR_COLUMNS.map(({ key }) => [key, resolveSourceColumn(columns, key)])
  ) as Record<HolidayCalendarColumnKey, string | null>;

  const usableColumns = columns.filter((column) => column.trim().length > 0);
  const missingRequired = !sourceByKey.date || !sourceByKey.holiday;

  if (missingRequired && usableColumns.length >= 4) {
    if (usableColumns.length >= 5) {
      sourceByKey.sl_no = sourceByKey.sl_no ?? usableColumns[0];
      sourceByKey.date = sourceByKey.date ?? usableColumns[1];
      sourceByKey.day = sourceByKey.day ?? usableColumns[2];
      sourceByKey.holiday = sourceByKey.holiday ?? usableColumns[3];
      sourceByKey.optional = sourceByKey.optional ?? usableColumns[4] ?? null;
    } else {
      sourceByKey.date = sourceByKey.date ?? usableColumns[0];
      sourceByKey.day = sourceByKey.day ?? usableColumns[1];
      sourceByKey.holiday = sourceByKey.holiday ?? usableColumns[2];
      sourceByKey.optional = sourceByKey.optional ?? usableColumns[3] ?? null;
    }
  }

  return sourceByKey;
}

function parseHolidayDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dmy = trimmed.match(/^(\d{1,2})[-/]([A-Za-z]{3,})[-/](\d{4})$/);
  if (dmy) {
    const month = MONTHS[dmy[2].slice(0, 3).toLowerCase()];
    if (month == null) return null;
    const date = new Date(Number(dmy[3]), month, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}

export function extractYearFromHolidayDate(date: string): number | null {
  const trimmed = date.trim();
  if (!trimmed) return null;

  const fromParsed = parseHolidayDate(trimmed);
  if (fromParsed) {
    return fromParsed.getFullYear();
  }

  const match = trimmed.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function formatDayName(value: string): string {
  const parsed = parseHolidayDate(value);
  if (!parsed) return "";
  return parsed.toLocaleDateString("en-US", { weekday: "long" });
}

export function yearsFromHolidayRows(rows: HolidayCalendarRow[]): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    const year = extractYearFromHolidayDate(row.date);
    if (year != null) years.add(year);
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function filterHolidayRowsByYear(rows: HolidayCalendarRow[], year: number): HolidayCalendarRow[] {
  const hasYearData = rows.some((row) => extractYearFromHolidayDate(row.date) != null);
  if (!hasYearData) return rows;
  return rows.filter((row) => extractYearFromHolidayDate(row.date) === year);
}

export function normalizeHolidayCalendarRows(parsed: ParsedSpreadsheet): HolidayCalendarRow[] {
  const sourceByKey = resolveSourceColumns(parsed.columns);

  return parsed.rows
    .map((row, index) => normalizeHolidayCalendarRow(row, sourceByKey, index))
    .filter((row) => isHolidayDataRow(row));
}

function isHolidayDataRow(row: HolidayCalendarRow): boolean {
  if (row.holiday.trim()) return true;
  if (row.date.trim()) return true;
  if (row.day.trim() && row.optional.trim()) return true;
  return false;
}

function normalizeHolidayCalendarRow(
  row: SpreadsheetRow,
  sourceByKey: Record<HolidayCalendarColumnKey, string | null>,
  index: number
): HolidayCalendarRow {
  const read = (key: HolidayCalendarColumnKey) => {
    const source = sourceByKey[key];
    return source ? String(row[source] ?? "").trim() : "";
  };

  const date = read("date");
  const day = read("day") || formatDayName(date);
  const slNo = read("sl_no") || String(index + 1);

  return {
    sl_no: slNo,
    date,
    day,
    holiday: read("holiday"),
    optional: read("optional"),
  };
}
