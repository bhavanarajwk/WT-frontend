import { parseApiDate } from "@/utils/apiDate";

export type SortDirection = "asc" | "desc";

export type SortValueType = "string" | "number" | "date";

export type ListSortOption<T> = {
  id: string;
  label: string;
  direction: SortDirection;
  type?: SortValueType;
  getValue: (row: T) => unknown;
};

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
    label: "Date",
    direction: "desc",
    type: "date",
    getValue: (row) => pickRowField(row, ["request_from_date", "requestFromDate"]),
  },
  {
    id: "employee_asc",
    label: "Name",
    direction: "asc",
    getValue: employeeNameValue,
  },
];

export const TIMELOG_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "date_desc",
    label: "Date",
    direction: "desc",
    type: "date",
    getValue: (row) => pickRowField(row, ["log_date", "logDate"]),
  },
  {
    id: "employee_asc",
    label: "Name",
    direction: "asc",
    getValue: employeeNameValue,
  },
];

export const PROJECT_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "name_asc",
    label: "Name",
    direction: "asc",
    getValue: (row) => pickRowField(row, ["project_name", "projectName"]),
  },
  {
    id: "code_asc",
    label: "Code",
    direction: "asc",
    getValue: (row) => pickRowField(row, ["project_code", "projectCode"]),
  },
];

export const EXIT_INTERVIEW_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "name_asc",
    label: "Name",
    direction: "asc",
    getValue: (row) => pickRowField(row, ["employee_name"]),
  },
];

export const TRAINING_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "start_desc",
    label: "Date",
    direction: "desc",
    type: "date",
    getValue: (row) => pickRowField(row, ["start_date", "training_start"]),
  },
  {
    id: "name_asc",
    label: "Name",
    direction: "asc",
    getValue: (row) => row.name,
  },
];

export const SESSION_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "date_desc",
    label: "Date",
    direction: "desc",
    type: "date",
    getValue: (row) => pickRowField(row, ["session_date"]),
  },
];

export const PARTICIPANT_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "name_asc",
    label: "Name",
    direction: "asc",
    getValue: (row) => pickRowField(row, ["name", "employee_name", "email"]),
  },
];

export const TITLE_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "title_asc",
    label: "Name",
    direction: "asc",
    getValue: (row) => pickRowField(row, ["title", "name"]),
  },
];

export const ALLOCATION_FORECAST_SORT_OPTIONS: ListSortOption<Record<string, unknown>>[] = [
  {
    id: "employee_asc",
    label: "Name",
    direction: "asc",
    getValue: (row) => pickRowField(row, ["employee_name", "employeeName"]),
  },
  {
    id: "project_asc",
    label: "Project",
    direction: "asc",
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
      direction: "asc",
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
    label: "Date",
    direction: "desc",
    type: "date",
    getValue: employeeDirectorySortDate,
  },
  {
    id: "name_asc",
    label: "Name",
    direction: "asc",
    getValue: (row) => row.display.name,
  },
];
