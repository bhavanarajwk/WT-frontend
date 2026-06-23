export type SpreadsheetRow = Record<string, string>;

export type ParsedSpreadsheet = {
  columns: string[];
  rows: SpreadsheetRow[];
};

function normalizeCellValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return formatDateForHolidayCell(value);
  }
  return String(value).trim();
}

function formatDateForHolidayCell(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function findHeaderRowIndex(matrix: string[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 20); i++) {
    const row = matrix[i] ?? [];
    const normalized = row.map((cell) =>
      cell
        .trim()
        .toLowerCase()
        .replace(/[._]+/g, " ")
        .replace(/\s+/g, " ")
    );
    const hasDate = normalized.some((cell) => /\bdate\b/.test(cell));
    const hasHoliday = normalized.some(
      (cell) => /\bholiday\b/.test(cell) || cell === "name" || cell === "holiday name"
    );
    if (hasDate && hasHoliday) return i;
  }
  return 0;
}

function buildParsedSheet(headers: string[], matrixRows: string[][]): ParsedSpreadsheet {
  const rows = matrixRows
    .map((cells) => {
      const row: SpreadsheetRow = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] ?? "";
      });
      return row;
    })
    .filter((row) => Object.values(row).some((value) => value.trim().length > 0));

  return { columns: headers, rows };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvText(text: string): ParsedSpreadsheet {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (!lines.length) {
    return { columns: [], rows: [] };
  }

  const matrix = lines.map((line) => parseCsvLine(line).map((cell) => cell.trim()));
  const headerIndex = findHeaderRowIndex(matrix);
  const headers = (matrix[headerIndex] ?? []).map((header, index) => header.trim() || `Column ${index + 1}`);

  return buildParsedSheet(headers, matrix.slice(headerIndex + 1));
}

async function parseXlsxFile(file: File): Promise<ParsedSpreadsheet> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { columns: [], rows: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!matrix.length) {
    return { columns: [], rows: [] };
  }

  const normalizedMatrix = matrix.map((row) =>
    (row ?? []).map((cell) => normalizeCellValue(cell))
  );
  const headerIndex = findHeaderRowIndex(normalizedMatrix);
  const headers = (normalizedMatrix[headerIndex] ?? []).map(
    (header, index) => header.trim() || `Column ${index + 1}`
  );

  return buildParsedSheet(headers, normalizedMatrix.slice(headerIndex + 1));
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    return parseXlsxFile(file);
  }

  const text = await file.text();
  return parseCsvText(text);
}

export function extractYearFromRow(row: SpreadsheetRow): number | null {
  for (const [key, raw] of Object.entries(row)) {
    const value = String(raw ?? "").trim();
    if (!value) continue;

    const keyLooksLikeDate = /date|year|day/i.test(key);
    const valueLooksLikeDate =
      /^\d{4}-\d{1,2}-\d{1,2}/.test(value) ||
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(value) ||
      /^\d{4}$/.test(value);

    if (!keyLooksLikeDate && !valueLooksLikeDate) continue;

    if (/^\d{4}$/.test(value)) {
      return Number(value);
    }

    const match = value.match(/\b(19|20)\d{2}\b/);
    if (match) {
      return Number(match[0]);
    }
  }

  return null;
}

export function yearsFromSpreadsheetRows(rows: SpreadsheetRow[]): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    const year = extractYearFromRow(row);
    if (year != null) years.add(year);
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function filterSpreadsheetRowsByYear(rows: SpreadsheetRow[], year: number): SpreadsheetRow[] {
  const hasYearData = rows.some((row) => extractYearFromRow(row) != null);
  if (!hasYearData) return rows;
  return rows.filter((row) => extractYearFromRow(row) === year);
}

export function rowsToCsv(columns: string[], rows: SpreadsheetRow[]): string {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  return [
    columns.map(escape).join(","),
    ...rows.map((row) => columns.map((column) => escape(row[column] ?? "")).join(",")),
  ].join("\n");
}

export function downloadCsvFile(filename: string, columns: string[], rows: SpreadsheetRow[]) {
  const blob = new Blob([rowsToCsv(columns, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
