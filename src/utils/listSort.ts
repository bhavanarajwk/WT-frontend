import { parseApiDate } from "@/utils/apiDate";

export type SortDirection = "asc" | "desc";

export type SortValueType = "string" | "number" | "date";

export type ListSortOption<T> = {
  id: string;
  label: string;
  direction: SortDirection;
  type?: SortValueType;
  /** Table column keys this sort option applies to (snake_case). */
  columnKeys?: string[];
  getValue: (row: T) => unknown;
};

function normalizeSortColumnKey(column: string): string {
  return column.trim().toLowerCase().replace(/\s+/g, "_");
}

export function sortOptionsForColumn<T>(
  column: string,
  options: ListSortOption<T>[]
): ListSortOption<T>[] {
  const key = normalizeSortColumnKey(column);
  return options.filter((opt) =>
    opt.columnKeys?.some((columnKey) => normalizeSortColumnKey(columnKey) === key)
  );
}

export function activeSortDirectionForColumn<T>(
  column: string,
  sortId: string,
  options: ListSortOption<T>[]
): SortDirection | null {
  const opt = options.find((o) => o.id === sortId);
  if (!opt || !sortOptionsForColumn(column, options).some((o) => o.id === sortId)) {
    return null;
  }
  return opt.direction;
}

export function toggleColumnSort<T>(
  column: string,
  currentSortId: string,
  options: ListSortOption<T>[]
): string {
  const columnOpts = sortOptionsForColumn(column, options);
  if (!columnOpts.length) return currentSortId;
  const current = columnOpts.find((o) => o.id === currentSortId);
  const asc = columnOpts.find((o) => o.direction === "asc");
  const desc = columnOpts.find((o) => o.direction === "desc");
  if (!current) return desc?.id ?? asc?.id ?? currentSortId;
  if (current.direction === "asc" && desc) return desc.id;
  if (current.direction === "desc" && asc) return asc.id;
  return current.id;
}

export type ListSortOptionMeta = {
  id: string;
  label: string;
};

function normalizeForCompare(value: unknown, type: SortValueType): string | number {
  if (value === null || value === undefined) {
    return type === "number" ? Number.NEGATIVE_INFINITY : "";
  }
  if (type === "number") {
    const n = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
  }
  if (type === "date") {
    const raw = String(value).trim();
    if (!raw || raw === "—") return Number.NEGATIVE_INFINITY;
    const parsed = parseApiDate(raw);
    return parsed ? parsed.getTime() : Number.NEGATIVE_INFINITY;
  }
  return String(value).trim().toLowerCase();
}

function compareNormalized(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}

export function compareSortValues(
  a: unknown,
  b: unknown,
  type: SortValueType = "string",
  direction: SortDirection = "asc"
): number {
  const av = normalizeForCompare(a, type);
  const bv = normalizeForCompare(b, type);
  const base = compareNormalized(av, bv);
  return direction === "desc" ? -base : base;
}

export function sortRows<T>(rows: T[], option: ListSortOption<T> | undefined): T[] {
  if (!option || rows.length < 2) return rows;
  const sorted = [...rows];
  sorted.sort((a, b) =>
    compareSortValues(option.getValue(a), option.getValue(b), option.type ?? "string", option.direction)
  );
  return sorted;
}

export function applyListSort<T>(
  rows: T[],
  sortId: string,
  options: ListSortOption<T>[]
): T[] {
  const option = options.find((o) => o.id === sortId) ?? options[0];
  return sortRows(rows, option);
}

export function pickRowField(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function employeeNameValue(row: Record<string, unknown>): unknown {
  return pickRowField(row, [
    "employee_display",
    "employee_name",
    "employeeName",
    "name",
    "email",
    "user_email",
  ]);
}

export const LEAVE_REQUEST_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "from_desc",
    label: "From",
    columnKeys: ["from", "request_from_date"],
    direction: "desc",
    type: "date",
    getValue: (row) => pickRowField(row, ["request_from_date", "requestFromDate"]),
  },
  {
    id: "from_asc",
    label: "From",
    columnKeys: ["from", "request_from_date"],
    direction: "asc",
    type: "date",
    getValue: (row) => pickRowField(row, ["request_from_date", "requestFromDate"]),
  },
  {
    id: "employee_asc",
    label: "Employee",
    columnKeys: ["employee", "employee_name", "name"],
    direction: "asc",
    getValue: employeeNameValue,
  },
  {
    id: "employee_desc",
    label: "Employee",
    columnKeys: ["employee", "employee_name", "name"],
    direction: "desc",
    getValue: employeeNameValue,
  },
];

export const TIMELOG_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "date_desc",
    label: "Log date",
    columnKeys: ["log_date", "date"],
    direction: "desc",
    type: "date",
    getValue: (row) => pickRowField(row, ["log_date", "logDate"]),
  },
  {
    id: "date_asc",
    label: "Log date",
    columnKeys: ["log_date", "date"],
    direction: "asc",
    type: "date",
    getValue: (row) => pickRowField(row, ["log_date", "logDate"]),
  },
  {
    id: "employee_asc",
    label: "Employee",
    columnKeys: ["employee", "employee_name", "name"],
    direction: "asc",
    getValue: employeeNameValue,
  },
  {
    id: "employee_desc",
    label: "Employee",
    columnKeys: ["employee", "employee_name", "name"],
    direction: "desc",
    getValue: employeeNameValue,
  },
];

export const PROJECT_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "name_asc",
    label: "Project name",
    columnKeys: ["project_name", "name"],
    direction: "asc",
    getValue: (row) => pickRowField(row, ["project_name", "projectName"]),
  },
  {
    id: "name_desc",
    label: "Project name",
    columnKeys: ["project_name", "name"],
    direction: "desc",
    getValue: (row) => pickRowField(row, ["project_name", "projectName"]),
  },
];

export const EXIT_INTERVIEW_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "name_asc",
    label: "Employee",
    columnKeys: ["employee", "employee_name", "name"],
    direction: "asc",
    getValue: (row) => pickRowField(row, ["employee_name"]),
  },
  {
    id: "name_desc",
    label: "Employee",
    columnKeys: ["employee", "employee_name", "name"],
    direction: "desc",
    getValue: (row) => pickRowField(row, ["employee_name"]),
  },
];

export const TRAINING_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "start_desc",
    label: "Date",
    columnKeys: ["start_date", "date"],
    direction: "desc",
    type: "date",
    getValue: (row) => pickRowField(row, ["start_date", "training_start"]),
  },
  {
    id: "start_asc",
    label: "Date",
    columnKeys: ["start_date", "date"],
    direction: "asc",
    type: "date",
    getValue: (row) => pickRowField(row, ["start_date", "training_start"]),
  },
  {
    id: "name_asc",
    label: "Name",
    columnKeys: ["name"],
    direction: "asc",
    getValue: (row) => row.name,
  },
  {
    id: "name_desc",
    label: "Name",
    columnKeys: ["name"],
    direction: "desc",
    getValue: (row) => row.name,
  },
];

export const SESSION_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "date_desc",
    label: "Session date",
    columnKeys: ["session_date"],
    direction: "desc",
    type: "date",
    getValue: (row) => pickRowField(row, ["session_date"]),
  },
  {
    id: "date_asc",
    label: "Session date",
    columnKeys: ["session_date"],
    direction: "asc",
    type: "date",
    getValue: (row) => pickRowField(row, ["session_date"]),
  },
];

export const PARTICIPANT_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "name_asc",
    label: "Name",
    columnKeys: ["name", "employee_name"],
    direction: "asc",
    getValue: (row) => pickRowField(row, ["name", "employee_name", "email"]),
  },
  {
    id: "name_desc",
    label: "Name",
    columnKeys: ["name", "employee_name"],
    direction: "desc",
    getValue: (row) => pickRowField(row, ["name", "employee_name", "email"]),
  },
];

export const TITLE_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "title_asc",
    label: "Title",
    columnKeys: ["title", "name"],
    direction: "asc",
    getValue: (row) => pickRowField(row, ["title", "name"]),
  },
  {
    id: "title_desc",
    label: "Title",
    columnKeys: ["title", "name"],
    direction: "desc",
    getValue: (row) => pickRowField(row, ["title", "name"]),
  },
];

export const ALLOCATION_LIST_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "project_end_asc",
    label: "Project",
    columnKeys: ["allocated_project", "project_name", "project"],
    direction: "asc",
    getValue: (row) =>
      pickRowField(row, ["project_name", "projectName", "allocated_project", "project_code"]),
  },
  {
    id: "project_asc",
    label: "Project",
    columnKeys: ["allocated_project", "project_name", "project"],
    direction: "asc",
    getValue: (row) =>
      pickRowField(row, ["project_name", "projectName", "allocated_project", "project_code"]),
  },
  {
    id: "project_desc",
    label: "Project",
    columnKeys: ["allocated_project", "project_name", "project"],
    direction: "desc",
    getValue: (row) =>
      pickRowField(row, ["project_name", "projectName", "allocated_project", "project_code"]),
  },
  {
    id: "allocation_type_asc",
    label: "Allocation type",
    columnKeys: ["allocation_type"],
    direction: "asc",
    getValue: (row) => pickRowField(row, ["allocation_type", "allocationType"]),
  },
  {
    id: "allocation_type_desc",
    label: "Allocation type",
    columnKeys: ["allocation_type"],
    direction: "desc",
    getValue: (row) => pickRowField(row, ["allocation_type", "allocationType"]),
  },
  {
    id: "billing_status_asc",
    label: "Billing status",
    columnKeys: ["billing_status"],
    direction: "asc",
    getValue: (row) => pickRowField(row, ["billing_status", "billingStatus"]),
  },
  {
    id: "billing_status_desc",
    label: "Billing status",
    columnKeys: ["billing_status"],
    direction: "desc",
    getValue: (row) => pickRowField(row, ["billing_status", "billingStatus"]),
  },
];

export const ALLOCATION_FORECAST_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "employee_asc",
    label: "Employee",
    columnKeys: ["employee_name", "employee", "name"],
    direction: "asc",
    getValue: (row) => pickRowField(row, ["employee_name", "employeeName"]),
  },
  {
    id: "employee_desc",
    label: "Employee",
    columnKeys: ["employee_name", "employee", "name"],
    direction: "desc",
    getValue: (row) => pickRowField(row, ["employee_name", "employeeName"]),
  },
  {
    id: "project_asc",
    label: "Project",
    columnKeys: ["project_name", "project"],
    direction: "asc",
    getValue: (row) => pickRowField(row, ["project_name", "projectName"]),
  },
  {
    id: "project_desc",
    label: "Project",
    columnKeys: ["project_name", "project"],
    direction: "desc",
    getValue: (row) => pickRowField(row, ["project_name", "projectName"]),
  },
];

export function resumeSortOptions(
  columns: string[]
): ListSortOption<Record<string, unknown>>[] {
  const nameKey =
    columns.find((c) => /^(employee_)?name$/i.test(c)) ??
    columns.find((c) => c.toLowerCase().includes("name")) ??
    "name";

  return [
    {
      id: "name_asc",
      label: "Name",
      columnKeys: [nameKey, "name", "employee_name"],
      direction: "asc",
      getValue: (row) => row[nameKey],
    },
    {
      id: "name_desc",
      label: "Name",
      columnKeys: [nameKey, "name", "employee_name"],
      direction: "desc",
      getValue: (row) => row[nameKey],
    },
  ];
}

export type EmployeeDirectoryRow = {
  record: Record<string, unknown>;
  empId: string;
  display: Record<string, string>;
};

/** Prefer onboard/invite time, then date of joining (raw API values, not display text). */
export function employeeDirectorySortDate(row: EmployeeDirectoryRow): string {
  const r = row.record;
  const created = pickRowField(r, ["created_at", "createdAt"]);
  if (created) return String(created);
  const joining = pickRowField(r, ["doj", "date_of_joining", "joining_date", "joiningDate"]);
  if (joining) return String(joining);
  const displayed = row.display.date_of_joining;
  return displayed && displayed !== "—" ? displayed : "";
}

export const EMPLOYEE_DIRECTORY_SORT_OPTIONS: ListSortOption<EmployeeDirectoryRow>[] = [
  {
    id: "doj_desc",
    label: "Date of joining",
    columnKeys: ["date_of_joining", "doj"],
    direction: "desc",
    type: "date",
    getValue: employeeDirectorySortDate,
  },
  {
    id: "doj_asc",
    label: "Date of joining",
    columnKeys: ["date_of_joining", "doj"],
    direction: "asc",
    type: "date",
    getValue: employeeDirectorySortDate,
  },
  {
    id: "name_asc",
    label: "Employee name",
    columnKeys: ["name", "employee_name"],
    direction: "asc",
    getValue: (row) => row.display.name,
  },
  {
    id: "name_desc",
    label: "Employee name",
    columnKeys: ["name", "employee_name"],
    direction: "desc",
    getValue: (row) => row.display.name,
  },
];
