import { cleanEmployeeName } from "@/utils/employeeDirectory";
import { parseApiDate } from "@/utils/apiDate";
import { compareSortValues, type ListSortOption } from "@/utils/listSort";
import type { OffboardListItem } from "@/types/offboard";
import { isServingNoticeUserStatus } from "@/utils/userStatus";
import { exitInterviewSubmissionDetailPath } from "@/constants/routes";

export type ExitSurveyFollowUpRow = OffboardListItem & {
  is_serving_notice?: boolean;
};

export const DEFAULT_EXIT_SURVEY_LWD_SORT_ID = "lwd_desc";

export const EXIT_SURVEY_LWD_SORT_OPTIONS: ListSortOption<ExitSurveyFollowUpRow>[] = [
  {
    id: "lwd_desc",
    label: "Last Working Day",
    columnKeys: ["last_working_day"],
    direction: "desc",
    type: "date",
    getValue: (row) => row.last_working_day,
  },
  {
    id: "lwd_asc",
    label: "Last Working Day",
    columnKeys: ["last_working_day"],
    direction: "asc",
    type: "date",
    getValue: (row) => row.last_working_day,
  },
];

export function sortExitSurveyFollowUpRows(
  rows: ExitSurveyFollowUpRow[],
  sortId: string = DEFAULT_EXIT_SURVEY_LWD_SORT_ID
): ExitSurveyFollowUpRow[] {
  const option =
    EXIT_SURVEY_LWD_SORT_OPTIONS.find((o) => o.id === sortId) ??
    EXIT_SURVEY_LWD_SORT_OPTIONS.find((o) => o.id === DEFAULT_EXIT_SURVEY_LWD_SORT_ID)!;

  return [...rows].sort((a, b) => {
    const byLwd = compareSortValues(
      option.getValue(a),
      option.getValue(b),
      option.type ?? "string",
      option.direction
    );
    if (byLwd !== 0) return byLwd;
    return a.employee_name.localeCompare(b.employee_name);
  });
}

export { exitInterviewSubmissionDetailPath };

const FOLLOW_UP_DAYS = 60;

export function computeExitSurveyFollowUpWindow(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - FOLLOW_UP_DAYS);

  const end = new Date(reference);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + FOLLOW_UP_DAYS);

  return { start, end };
}

export function followUpWindowFromApi(
  start?: string | null,
  end?: string | null
): { start: Date; end: Date } {
  const parsedStart = parseApiDate(start ?? "");
  const parsedEnd = parseApiDate(end ?? "");
  if (parsedStart && parsedEnd) {
    return { start: parsedStart, end: parsedEnd };
  }
  return computeExitSurveyFollowUpWindow();
}

export function pickLastWorkingDay(row: Record<string, unknown>): string {
  return String(
    row.last_working_day ??
      row.lastWorkingDay ??
      row.lwd ??
      row.exit_interview_last_working_day ??
      ""
  ).trim();
}

export function isServingNoticeEmployee(row: Record<string, unknown>): boolean {
  return isServingNoticeUserStatus(row.status);
}

/** @deprecated Use isServingNoticeEmployee */
export function isInNoticeEmployee(row: Record<string, unknown>): boolean {
  return isServingNoticeEmployee(row);
}

export function mapServingNoticeFollowUpRow(
  row: Record<string, unknown>
): ExitSurveyFollowUpRow | null {
  const emp_id = String(row.emp_id ?? row.empId ?? "").trim() || null;
  const email = String(row.email ?? "").trim();
  if (!emp_id && !email) return null;

  return {
    emp_id,
    employee_name: cleanEmployeeName(row),
    email: email || "—",
    last_working_day: pickLastWorkingDay(row) || null,
    exit_survey_submitted: false,
    can_resend_exit_survey: true,
    can_view_submission: false,
    submission_status: "PENDING",
    lookup_id: emp_id || email,
    is_serving_notice: true,
  };
}

/** @deprecated Use mapServingNoticeFollowUpRow */
export const mapInNoticeFollowUpRow = mapServingNoticeFollowUpRow;

function followUpRowKey(row: ExitSurveyFollowUpRow): string {
  const emp = String(row.emp_id ?? "").trim().toLowerCase();
  if (emp) return `emp:${emp}`;
  const email = String(row.email ?? "").trim().toLowerCase();
  if (email && email !== "—") return `email:${email}`;
  const lookup = String(row.lookup_id ?? "").trim().toLowerCase();
  if (lookup) return `lookup:${lookup}`;
  return "";
}

export function followUpRowLookupId(row: ExitSurveyFollowUpRow): string {
  return String(row.lookup_id ?? row.emp_id ?? row.email ?? "").trim();
}

export function canViewExitSurveySubmission(row: ExitSurveyFollowUpRow): boolean {
  return row.can_view_submission === true;
}

export type ExitSurveyStatusFilter = "PENDING" | "COMPLETED";

export const DEFAULT_EXIT_SURVEY_STATUS_FILTER: ExitSurveyStatusFilter = "PENDING";

export function isExitSurveyCompleted(row: ExitSurveyFollowUpRow): boolean {
  if (row.submission_status === "SUBMITTED") return true;
  if (row.exit_survey_submitted === true) return true;
  return row.can_view_submission === true;
}

export function filterExitSurveyFollowUpByStatus(
  rows: ExitSurveyFollowUpRow[],
  status: ExitSurveyStatusFilter
): ExitSurveyFollowUpRow[] {
  if (status === "COMPLETED") {
    return rows.filter(isExitSurveyCompleted);
  }
  return rows.filter((row) => !isExitSurveyCompleted(row));
}

export function isResendableFollowUpRow(row: ExitSurveyFollowUpRow): boolean {
  if (!Boolean(String(row.emp_id ?? "").trim())) return false;
  if (isExitSurveyCompleted(row)) return false;
  if (row.can_resend_exit_survey === false) return false;
  return true;
}

export function resendableEmpIdFromRow(row: ExitSurveyFollowUpRow): string {
  return String(row.emp_id ?? "").trim();
}

export function resendableEmpIdsFromRows(rows: ExitSurveyFollowUpRow[]): string[] {
  return Array.from(
    new Set(rows.filter(isResendableFollowUpRow).map(resendableEmpIdFromRow).filter(Boolean))
  );
}

export function isResendableOffboardListRow(row: {
  emp_id?: string | null;
  exit_survey_submitted?: boolean;
  submission_status?: string;
  can_resend_exit_survey?: boolean;
}): boolean {
  if (!Boolean(String(row.emp_id ?? "").trim())) return false;
  if (row.can_resend_exit_survey === false) return false;
  if (row.exit_survey_submitted === true) return false;
  if (row.submission_status === "SUBMITTED") return false;
  return true;
}

export function resendableOffboardEmpIds(
  rows: Array<{ emp_id?: string | null; exit_survey_submitted?: boolean; submission_status?: string; can_resend_exit_survey?: boolean }>
): string[] {
  return Array.from(
    new Set(
      rows
        .filter(isResendableOffboardListRow)
        .map((row) => String(row.emp_id ?? "").trim())
        .filter(Boolean)
    )
  );
}

const MAX_BULK_RESEND_SELECTION = 100;

export function mergeEmpIdSelection(current: string[], nextIds: string[]): string[] {
  const merged = new Set(current);
  for (const id of nextIds) {
    if (merged.size >= MAX_BULK_RESEND_SELECTION) break;
    merged.add(id);
  }
  return Array.from(merged);
}

function matchesFollowUpSearch(row: ExitSurveyFollowUpRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.employee_name, row.email, row.emp_id].some((value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .includes(q)
  );
}

function matchesFollowUpType(row: Record<string, unknown>, type: string): boolean {
  const filter = type.trim().toUpperCase();
  if (!filter) return true;
  return String(row.user_type ?? row.userType ?? "")
    .trim()
    .toUpperCase() === filter;
}

export function filterServingNoticeFollowUpRows(
  onboardRows: Array<Record<string, unknown>>,
  options: {
    search?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
  }
): ExitSurveyFollowUpRow[] {
  return onboardRows
    .filter(isServingNoticeEmployee)
    .filter((row) => matchesFollowUpType(row, options.type ?? ""))
    .map(mapServingNoticeFollowUpRow)
    .filter((row): row is ExitSurveyFollowUpRow => Boolean(row))
    .filter((row) => {
      const lwd = row.last_working_day?.trim();
      if (!options.fromDate && !options.toDate) {
        return true;
      }
      const parsed = parseApiDate(lwd);
      if (!parsed) return false;
      const from = options.fromDate?.trim() ? parseApiDate(options.fromDate) : null;
      const to = options.toDate?.trim() ? parseApiDate(options.toDate) : null;
      if (from && parsed < from) return false;
      if (to && parsed > to) return false;
      return true;
    })
    .filter((row) => matchesFollowUpSearch(row, options.search ?? ""));
}

/** @deprecated Use filterServingNoticeFollowUpRows */
export const filterInNoticeFollowUpRows = filterServingNoticeFollowUpRows;

export function mergeExitSurveyFollowUpRows(
  offboardItems: OffboardListItem[],
  servingNoticeItems: ExitSurveyFollowUpRow[]
): ExitSurveyFollowUpRow[] {
  const merged = new Map<string, ExitSurveyFollowUpRow>();

  for (const row of offboardItems) {
    const key = followUpRowKey(row);
    if (!key) continue;
    const email = String(row.email ?? "").trim();
    merged.set(key, {
      ...row,
      is_serving_notice: false,
      lookup_id: row.lookup_id ?? row.emp_id ?? (email && email !== "—" ? email : undefined),
    });
  }

  for (const row of servingNoticeItems) {
    const key = followUpRowKey(row);
    if (!key || merged.has(key)) continue;
    merged.set(key, row);
  }

  return Array.from(merged.values());
}

export function paginateFollowUpRows<T>(rows: T[], page: number, size: number): T[] {
  const safePage = Math.max(0, page);
  const safeSize = Math.max(1, size);
  const start = safePage * safeSize;
  return rows.slice(start, start + safeSize);
}
