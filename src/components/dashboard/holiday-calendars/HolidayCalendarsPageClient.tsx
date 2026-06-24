"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { ManagementListCard } from "@/components/dashboard/ui/ManagementListCard";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showErrorToast } from "@/lib/toast";
import { parseSpreadsheetFile } from "@/utils/parseSpreadsheetFile";
import {
  filterHolidayRowsByYear,
  HOLIDAY_CALENDAR_COLUMNS,
  normalizeHolidayCalendarRows,
  type HolidayCalendarColumnKey,
  type HolidayCalendarRow,
  yearsFromHolidayRows,
} from "@/utils/holidayCalendarTable";
import { downloadCsvFile } from "@/utils/parseSpreadsheetFile";

const DEFAULT_YEAR_SPAN = 5;
const HOLIDAY_TABLE_COLUMN_COUNT = HOLIDAY_CALENDAR_COLUMNS.length;

function defaultYearOptions(anchorYear: number): string[] {
  return Array.from({ length: DEFAULT_YEAR_SPAN * 2 + 1 }, (_, index) =>
    String(anchorYear - DEFAULT_YEAR_SPAN + index)
  );
}

const HOLIDAY_COLUMN_WIDTHS: Record<HolidayCalendarColumnKey, string> = {
  sl_no: "8%",
  date: "14%",
  day: "16%",
  holiday: "24%",
  optional: "38%",
};

function cellClassName(key: HolidayCalendarColumnKey): string {
  const base = "px-3 py-2 text-left text-sm align-middle";
  if (key === "optional") return `${base} whitespace-normal`;
  if (key === "sl_no") return `${base} whitespace-nowrap tabular-nums`;
  return `${base} whitespace-nowrap`;
}

export function HolidayCalendarsPageClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [rows, setRows] = useState<HolidayCalendarRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const yearOptions = useMemo(() => {
    const fromData = yearsFromHolidayRows(rows);
    const merged = new Set([...defaultYearOptions(currentYear), ...fromData.map(String)]);
    return Array.from(merged)
      .map(Number)
      .sort((a, b) => b - a)
      .map(String);
  }, [currentYear, rows]);

  const filteredRows = useMemo(
    () => filterHolidayRowsByYear(rows, Number(selectedYear)),
    [rows, selectedYear]
  );

  const yearSelectItems = useMemo(
    () => yearOptions.map((year) => ({ value: year, label: year })),
    [yearOptions]
  );

  async function handleUpload(file: File) {
    setParsing(true);
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (!parsed.columns.length) {
        throw new Error("No columns were found in the uploaded file.");
      }

      const normalizedRows = normalizeHolidayCalendarRows(parsed);
      if (!normalizedRows.length) {
        throw new Error(
          "No holiday rows were found. Use columns Sl. No., Date, Day, Holiday, and Optional."
        );
      }

      setRows(normalizedRows);
      setUploadedFileName(file.name);

      const yearsInFile = yearsFromHolidayRows(normalizedRows);
      if (yearsInFile.length) {
        const preferred =
          yearsInFile.find((year) => year === currentYear) ?? yearsInFile[0] ?? currentYear;
        setSelectedYear(String(preferred));
      }
    } catch (error) {
      setRows([]);
      setUploadedFileName("");
      showErrorToast(error instanceof Error ? error.message : "Could not parse the uploaded file.");
    } finally {
      setParsing(false);
    }
  }

  function handleDownload() {
    const exportColumns = HOLIDAY_CALENDAR_COLUMNS.map((column) => column.label);
    const exportRows = (filteredRows.length ? filteredRows : [{} as HolidayCalendarRow]).map((row) =>
      Object.fromEntries(
        HOLIDAY_CALENDAR_COLUMNS.map(({ key, label }) => [label, row[key]?.trim() ?? ""])
      )
    );

    downloadCsvFile(`holiday-calendar-${selectedYear}.csv`, exportColumns, exportRows);
  }

  return (
    <DashboardPageShell>
      <ManagementListCard
        title="Holiday Calendar"
        description={
          uploadedFileName
            ? `Upload a CSV or XLSX file to preview holidays by year. Loaded file: ${uploadedFileName}`
            : "Upload a CSV or XLSX file to preview holidays by year. Nothing is saved to the server yet."
        }
        headerAction={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void handleUpload(file);
              }}
            />
            <Button
              variant="brand"
              type="button"
              className="h-10 shrink-0 px-4"
              disabled={parsing}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
            <Button
              variant="outline"
              type="button"
              className="h-10 shrink-0 px-4"
              disabled={parsing}
              onClick={handleDownload}
            >
              Download
            </Button>
            <div className="w-32 shrink-0">
              <label className="sr-only" htmlFor="holiday-calendar-year">
                Year
              </label>
              <Select
                value={selectedYear}
                onValueChange={(next) => setSelectedYear(next ?? selectedYear)}
                items={yearSelectItems}
              >
                <SelectTrigger id="holiday-calendar-year" aria-label="Year" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearSelectItems.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      >
        <div className="w-full overflow-x-auto rounded-xl border border-wt-border">
          <WtTable className="w-full table-fixed">
            <colgroup>
              {HOLIDAY_CALENDAR_COLUMNS.map((column) => (
                <col key={column.key} style={{ width: HOLIDAY_COLUMN_WIDTHS[column.key] }} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {HOLIDAY_CALENDAR_COLUMNS.map((column) => (
                  <TableHead key={column.key} className="text-left">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsing ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <TableRow key={`holiday-skeleton-${rowIndex}`}>
                    {HOLIDAY_CALENDAR_COLUMNS.map((column) => (
                      <TableCell key={column.key} className={cellClassName(column.key)}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredRows.length ? (
                filteredRows.map((row, rowIndex) => (
                  <TableRow key={`holiday-row-${rowIndex}`}>
                    {HOLIDAY_CALENDAR_COLUMNS.map((column) => (
                      <TableCell key={column.key} className={cellClassName(column.key)}>
                        {row[column.key]?.trim() ? row[column.key] : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={HOLIDAY_TABLE_COLUMN_COUNT}
                    className="py-16 text-center text-sm text-wt-text-muted"
                  >
                    No Data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </WtTable>
        </div>
      </ManagementListCard>
    </DashboardPageShell>
  );
}
