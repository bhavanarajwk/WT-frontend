import type { HolidayCalendarRow } from "@/utils/holidayCalendarTable";
import { normalizeHolidayCalendarRows } from "@/utils/holidayCalendarTable";
import {
  buildHolidayCalendarFile,
  holidayCalendarFileMimeType,
} from "@/utils/buildHolidayCalendarFile";
import { parseSpreadsheetFile } from "@/utils/parseSpreadsheetFile";
import {
  HOLIDAY_CALENDAR_FILE_EXTENSIONS,
  holidayCalendarObjectKey,
  holidayCalendarStorageFileName,
  resolveHolidayCalendarExtension,
  resolveHolidayCalendarUploadYear,
} from "@/utils/holidayCalendarStorage";

export type StoredHolidayCalendarResponse = {
  year: number;
  fileName: string;
  rows: HolidayCalendarRow[];
  uploadedAt: string | null;
};

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.error ?? payload.message ?? response.statusText;
  } catch {
    return response.statusText || "Request failed.";
  }
}

function fileApiPath(objectKey: string): string {
  return `/api/files/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}

async function fetchObject(objectKey: string): Promise<Response> {
  return fetch(fileApiPath(objectKey), {
    method: "GET",
    credentials: "include",
  });
}

async function parseStoredFileResponse(
  response: Response,
  year: number
): Promise<StoredHolidayCalendarResponse> {
  const fileName =
    response.headers.get("x-original-filename")?.trim() ||
    holidayCalendarStorageFileName(year, resolveHolidayCalendarExtension("holiday_calendar.csv"));
  const uploadedAt = response.headers.get("x-uploaded-at");
  const blob = await response.blob();
  const file = new File([blob], fileName, {
    type: blob.type || "application/octet-stream",
  });

  const parsed = await parseSpreadsheetFile(file);
  const rows = normalizeHolidayCalendarRows(parsed);

  return {
    year,
    fileName,
    rows,
    uploadedAt,
  };
}

export const holidayCalendarStorageService = {
  resolveUploadYear(fileName: string, rows: HolidayCalendarRow[], currentYear: number): number {
    return resolveHolidayCalendarUploadYear(fileName, rows, currentYear);
  },

  async fetchByYear(year: number): Promise<StoredHolidayCalendarResponse | null> {
    for (const extension of HOLIDAY_CALENDAR_FILE_EXTENSIONS) {
      const objectKey = holidayCalendarObjectKey(year, extension);
      const response = await fetchObject(objectKey);

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      return parseStoredFileResponse(response, year);
    }

    return null;
  },

  async uploadFile(file: File, year: number, cleanedRows?: HolidayCalendarRow[]): Promise<void> {
    const extension = resolveHolidayCalendarExtension(file.name);
    const storageFileName = holidayCalendarStorageFileName(year, extension);
    const objectKey = holidayCalendarObjectKey(year, extension);

    let uploadBody: Blob = file;
    if (cleanedRows?.length) {
      uploadBody = await buildHolidayCalendarFile(cleanedRows, extension);
    }

    const response = await fetch(fileApiPath(objectKey), {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": holidayCalendarFileMimeType(extension),
        "X-Original-Filename": storageFileName,
      },
      body: uploadBody,
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
  },
};
