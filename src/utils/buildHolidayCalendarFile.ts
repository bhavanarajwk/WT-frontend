import type { HolidayCalendarRow } from "@/utils/holidayCalendarTable";
import { HOLIDAY_CALENDAR_COLUMNS } from "@/utils/holidayCalendarTable";
import { rowsToCsv } from "@/utils/parseSpreadsheetFile";
import type { HolidayCalendarFileExtension } from "@/utils/holidayCalendarStorage";

function spreadsheetRowsFromHolidayRows(rows: HolidayCalendarRow[]) {
  const columns = HOLIDAY_CALENDAR_COLUMNS.map((column) => column.label);
  const spreadsheetRows = rows.map((row) =>
    Object.fromEntries(HOLIDAY_CALENDAR_COLUMNS.map(({ key, label }) => [label, row[key] ?? ""]))
  );
  return { columns, spreadsheetRows };
}

export async function buildHolidayCalendarFile(
  rows: HolidayCalendarRow[],
  extension: HolidayCalendarFileExtension
): Promise<Blob> {
  const { columns, spreadsheetRows } = spreadsheetRowsFromHolidayRows(rows);

  if (extension === ".csv") {
    return new Blob([rowsToCsv(columns, spreadsheetRows)], {
      type: "text/csv;charset=utf-8",
    });
  }

  const XLSX = await import("xlsx");
  const matrix = [
    columns,
    ...rows.map((row) => HOLIDAY_CALENDAR_COLUMNS.map(({ key }) => row[key] ?? "")),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Holiday Calendar");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function holidayCalendarFileMimeType(extension: HolidayCalendarFileExtension): string {
  if (extension === ".csv") return "text/csv;charset=utf-8";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}
