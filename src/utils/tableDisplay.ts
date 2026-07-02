import { formatUserTypeLabel } from "@/utils/offboardingFormState";
import { formatRoleDisplayValue } from "@/utils/roles";
import { toTitleCase } from "@/utils/titleCase";

const EMAIL_COLUMN_KEYS = new Set([
  "email",
  "employee_email",
  "employeeemail",
  "user_email",
  "useremail",
  "emp_email",
  "empemail",
  "personal_email",
  "personalemail",
  "work_email",
  "workemail",
  "mail_id",
  "mailid",
  "subject_employee_email",
  "account_manager_email",
  "acc_manager_email",
]);

const NAME_COLUMN_KEYS = new Set([
  "name",
  "employee_name",
  "employeename",
  "employee",
  "emp_name",
  "empname",
  "full_name",
  "fullname",
  "display_name",
  "displayname",
  "requested_by_name",
  "requestedbyname",
  "trainer_name",
  "trainername",
  "trainee_name",
  "traineename",
]);

const NAME_VALUE_KEYS = [
  "employee_name",
  "employeeName",
  "name",
  "employee",
  "emp_name",
  "full_name",
  "display_name",
  "trainer_name",
  "trainee_name",
  "requested_by_name",
  "user_name",
  "userName",
] as const;

function normalizeColumnKey(column: string): string {
  return column.trim().toLowerCase().replace(/\s+/g, "_");
}

export function isEmailTableColumn(column: string): boolean {
  const key = normalizeColumnKey(column);
  if (EMAIL_COLUMN_KEYS.has(key)) return true;
  return key.includes("email");
}

export function isNameTableColumn(column: string): boolean {
  const key = normalizeColumnKey(column);
  if (NAME_COLUMN_KEYS.has(key)) return true;
  if (key === "employee") return true;
  if (key.endsWith("_name") && !key.includes("project") && !key.includes("file") && !key.includes("material")) {
    return true;
  }
  return false;
}

export function resolveEmployeeNameFromRow(row: Record<string, unknown>): string {
  for (const key of NAME_VALUE_KEYS) {
    const raw = String(row[key] ?? "").trim();
    if (!raw || raw.includes("@")) continue;
    const cleaned = raw.replace(/\s*\([^()@\s]+@[^()@\s]+\.[^()@\s]+\)\s*$/, "").trim();
    if (cleaned) return cleaned;
  }
  return "—";
}

export function sanitizeTableColumns(columns: readonly string[]): string[] {
  const list = [...columns];
  const hadName = list.some(isNameTableColumn);
  const hadEmail = list.some(isEmailTableColumn);
  const withoutEmail = list.filter((col) => !isEmailTableColumn(col));
  if (hadName || !hadEmail) return withoutEmail;
  return ["name", ...withoutEmail];
}

export function sanitizeTableRowsForDisplay(
  rows: Array<Record<string, unknown>>,
  columns: readonly string[]
): Array<Record<string, unknown>> {
  const displayColumns = sanitizeTableColumns(columns);
  const nameColumns = displayColumns.filter(isNameTableColumn);
  const primaryNameColumn = displayColumns.includes("name")
    ? "name"
    : nameColumns[0] ?? "name";

  return rows.map((row) => {
    const resolvedName = resolveEmployeeNameFromRow(row);
    const out: Record<string, unknown> = { ...row };

    for (const col of nameColumns) {
      const current = String(out[col] ?? "").trim();
      if (!current || current.includes("@")) {
        out[col] = resolvedName;
      }
    }

    if (displayColumns.includes("name")) {
      const current = String(out.name ?? "").trim();
      if (!current || current.includes("@")) {
        out.name = resolvedName;
      }
    } else if (!nameColumns.length && displayColumns.includes(primaryNameColumn)) {
      out[primaryNameColumn] = resolvedName;
    }

    return out;
  });
}

const COLUMN_HEADER_LABELS: Record<string, string> = {
  session_date: "Session date",
  start_time: "Start time",
  end_time: "End time",
  meeting_link: "Meeting link",
  enrollment_status: "Enrollment status",
  material_url: "Material URL",
  visibility: "Visibility",
  file_url: "File URL",
  weight_percent: "Weight %",
  duration_days: "Duration (days)",
  date_of_joining: "Date of joining",
  date_of_birth: "Date of birth",
  phone_number: "Phone number",
  created_on: "Created on",
  user_type: "User Type",
  work_mode: "Work mode",
  log_date: "Log date",
  request_from_date: "From",
  request_to_date: "To",
  request_type: "Request type",
  project_name: "Project name",
  project_type: "Project type",
  employee_name: "Employee",
};

export function formatTableColumnHeader(column: string): string {
  const key = normalizeColumnKey(column);
  if (COLUMN_HEADER_LABELS[key]) return COLUMN_HEADER_LABELS[key];
  return toTitleCase(column.replaceAll("_", " "))
    .replace(/\bUrl\b/g, "URL")
    .replace(/\bId\b/g, "ID");
}

export function formatTableCellValue(column: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  const key = normalizeColumnKey(column);
  if (key === "user_type" || key === "usertype") {
    return formatUserTypeLabel(String(value));
  }
  if (key === "role" || key.endsWith("_role") || key === "portal_role" || key === "roles") {
    return formatRoleDisplayValue(value);
  }
  const text = String(value).trim();
  return text || "—";
}

export function prepareTableForDisplay(
  columns: readonly string[],
  rows: Array<Record<string, unknown>>
): { columns: string[]; rows: Array<Record<string, unknown>> } {
  const displayColumns = sanitizeTableColumns(columns);
  return {
    columns: displayColumns,
    rows: sanitizeTableRowsForDisplay(rows, displayColumns),
  };
}
