import type { ApiEnvelope } from "@/api/httpClient";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { formatApiDateDisplay } from "@/utils/apiDate";

export type TalentPoolTableKey = "onBench" | "unallocated" | "nonBillable";

export type AllocateTarget = {
  employee_email: string;
  allocate_employee_email: string;
};

export type OnBenchTalentPoolItem = AllocateTarget & {
  user_id: number | null;
  allocation_id: number | null;
  employee_name: string;
  emp_id: string | null;
  allocated_percent: number | null;
  bench_allocation_date: string | null;
  talent_pool_start_date: string | null;
  days_on_talent_pool: number | null;
  previous_project_code: string | null;
  previous_project_name: string | null;
};

export type UnallocatedTalentPoolItem = AllocateTarget & {
  user_id: number | null;
  employee_name: string;
  emp_id: string | null;
  project_load_percent_today: number | null;
  has_any_allocation: boolean;
  days_without_project_allocation: number | null;
  previous_project_code: string | null;
  previous_project_name: string | null;
};

export type NonBillableTalentPoolItem = AllocateTarget & {
  user_id: number | null;
  allocation_id: number | null;
  employee_name: string;
  emp_id: string | null;
  project_code: string | null;
  project_name: string | null;
  role: string | null;
  allocated_percent: number | null;
  allocation_type: string | null;
  billing_status: string | null;
  start_date: string | null;
  end_date: string | null;
  days_on_non_billable: number | null;
};

export type TalentPoolTablePage<T> = {
  label: string;
  table_key: TalentPoolTableKey;
  current_page: number;
  total_pages: number;
  page_size: number;
  total_elements: number;
  items: T[];
};

export type TalentPoolDashboardData = {
  label: string;
  on_bench: TalentPoolTablePage<OnBenchTalentPoolItem>;
  unallocated: TalentPoolTablePage<UnallocatedTalentPoolItem>;
  non_billable: TalentPoolTablePage<NonBillableTalentPoolItem>;
};

export type BenchForecastItem = {
  name: string;
  email: string;
  emp_id: string | null;
  project_name: string | null;
  role: string | null;
  allocation_end_date: string | null;
  expected_bench_hours: number | null;
  manager_names: string[];
  allocate_employee_email: string;
};

export type BenchForecastPage = {
  current_page: number;
  total_pages: number;
  page_size: number;
  total_elements: number;
  items: BenchForecastItem[];
};

const PAGE_SIZE_DEFAULT = 50;

function readOptionalNumber(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function readAllocateFields(raw: Record<string, unknown>): AllocateTarget {
  const employeeEmail = String(raw.employee_email ?? raw.employeeEmail ?? "").trim();
  const allocateEmail = String(
    raw.allocate_employee_email ?? raw.allocateEmployeeEmail ?? employeeEmail
  ).trim();
  return {
    employee_email: employeeEmail,
    allocate_employee_email: allocateEmail || employeeEmail,
  };
}

function parsePagedMeta(data: Record<string, unknown>, itemsLength: number) {
  const current_page = Number(data.current_page ?? data.currentPage ?? 0);
  const total_pages = Number(data.total_pages ?? data.totalPages ?? 1);
  const page_size = Number(data.page_size ?? data.pageSize ?? PAGE_SIZE_DEFAULT);
  const total_elements = Number(data.total_elements ?? data.totalElements ?? itemsLength);
  return {
    current_page: Number.isFinite(current_page) ? current_page : 0,
    total_pages: Number.isFinite(total_pages) && total_pages > 0 ? total_pages : 1,
    page_size: Number.isFinite(page_size) ? page_size : PAGE_SIZE_DEFAULT,
    total_elements: Number.isFinite(total_elements) ? total_elements : itemsLength,
  };
}

export function normalizeOnBenchItem(raw: Record<string, unknown>): OnBenchTalentPoolItem {
  const alloc = readAllocateFields(raw);
  return {
    ...alloc,
    user_id: readOptionalNumber(raw.user_id ?? raw.userId),
    allocation_id: readOptionalNumber(raw.allocation_id ?? raw.allocationId),
    employee_name: String(raw.employee_name ?? raw.employeeName ?? "").trim(),
    emp_id: (() => {
      const v = String(raw.emp_id ?? raw.empId ?? "").trim();
      return v || null;
    })(),
    allocated_percent: readOptionalNumber(raw.allocated_percent ?? raw.allocatedPercent),
    bench_allocation_date: (() => {
      const v = String(raw.bench_allocation_date ?? raw.benchAllocationDate ?? "").trim();
      return v || null;
    })(),
    talent_pool_start_date: (() => {
      const v = String(raw.talent_pool_start_date ?? raw.talentPoolStartDate ?? "").trim();
      return v || null;
    })(),
    days_on_talent_pool: readOptionalNumber(raw.days_on_talent_pool ?? raw.daysOnTalentPool),
    previous_project_code: (() => {
      const v = String(raw.previous_project_code ?? raw.previousProjectCode ?? "").trim();
      return v || null;
    })(),
    previous_project_name: (() => {
      const v = String(raw.previous_project_name ?? raw.previousProjectName ?? "").trim();
      return v || null;
    })(),
  };
}

export function normalizeUnallocatedItem(raw: Record<string, unknown>): UnallocatedTalentPoolItem {
  const alloc = readAllocateFields(raw);
  const hasAny = raw.has_any_allocation ?? raw.hasAnyAllocation;
  return {
    ...alloc,
    user_id: readOptionalNumber(raw.user_id ?? raw.userId),
    employee_name: String(raw.employee_name ?? raw.employeeName ?? "").trim(),
    emp_id: (() => {
      const v = String(raw.emp_id ?? raw.empId ?? "").trim();
      return v || null;
    })(),
    project_load_percent_today: readOptionalNumber(
      raw.project_load_percent_today ?? raw.projectLoadPercentToday
    ),
    has_any_allocation: hasAny === true || hasAny === "true" || hasAny === 1,
    days_without_project_allocation: readOptionalNumber(
      raw.days_without_project_allocation ?? raw.daysWithoutProjectAllocation
    ),
    previous_project_code: (() => {
      const v = String(raw.previous_project_code ?? raw.previousProjectCode ?? "").trim();
      return v || null;
    })(),
    previous_project_name: (() => {
      const v = String(raw.previous_project_name ?? raw.previousProjectName ?? "").trim();
      return v || null;
    })(),
  };
}

export function normalizeNonBillableItem(raw: Record<string, unknown>): NonBillableTalentPoolItem {
  const alloc = readAllocateFields(raw);
  return {
    ...alloc,
    user_id: readOptionalNumber(raw.user_id ?? raw.userId),
    allocation_id: readOptionalNumber(raw.allocation_id ?? raw.allocationId),
    employee_name: String(raw.employee_name ?? raw.employeeName ?? "").trim(),
    emp_id: (() => {
      const v = String(raw.emp_id ?? raw.empId ?? "").trim();
      return v || null;
    })(),
    project_code: (() => {
      const v = String(raw.project_code ?? raw.projectCode ?? "").trim();
      return v || null;
    })(),
    project_name: (() => {
      const v = String(raw.project_name ?? raw.projectName ?? "").trim();
      return v || null;
    })(),
    role: (() => {
      const v = String(raw.role ?? "").trim();
      return v || null;
    })(),
    allocated_percent: readOptionalNumber(raw.allocated_percent ?? raw.allocatedPercent),
    allocation_type: (() => {
      const v = String(raw.allocation_type ?? raw.allocationType ?? "").trim();
      return v || null;
    })(),
    billing_status: (() => {
      const v = String(raw.billing_status ?? raw.billingStatus ?? "").trim();
      return v || null;
    })(),
    start_date: (() => {
      const v = String(raw.start_date ?? raw.startDate ?? "").trim();
      return v || null;
    })(),
    end_date: (() => {
      const v = String(raw.end_date ?? raw.endDate ?? "").trim();
      return v || null;
    })(),
    days_on_non_billable: readOptionalNumber(raw.days_on_non_billable ?? raw.daysOnNonBillable),
  };
}

function parseTablePage<T>(
  data: Record<string, unknown>,
  tableKey: TalentPoolTableKey,
  defaultLabel: string,
  normalize: (raw: Record<string, unknown>) => T
): TalentPoolTablePage<T> {
  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  const meta = parsePagedMeta(data, itemsRaw.length);
  const keyRaw = String(data.table_key ?? data.tableKey ?? tableKey).trim();

  return {
    label: String(data.label ?? defaultLabel).trim() || defaultLabel,
    table_key: (keyRaw as TalentPoolTableKey) || tableKey,
    ...meta,
    items: itemsRaw
      .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
      .map(normalize),
  };
}

export function parseOnBenchPage(res: ApiEnvelope<unknown>): TalentPoolTablePage<OnBenchTalentPoolItem> {
  const data = (res.data ?? {}) as Record<string, unknown>;
  return parseTablePage(data, "onBench", "Talent Pool", normalizeOnBenchItem);
}

export function parseUnallocatedPage(
  res: ApiEnvelope<unknown>
): TalentPoolTablePage<UnallocatedTalentPoolItem> {
  const data = (res.data ?? {}) as Record<string, unknown>;
  return parseTablePage(data, "unallocated", "Not allocated to project", normalizeUnallocatedItem);
}

export function parseNonBillablePage(
  res: ApiEnvelope<unknown>
): TalentPoolTablePage<NonBillableTalentPoolItem> {
  const data = (res.data ?? {}) as Record<string, unknown>;
  return parseTablePage(data, "nonBillable", "Non-billable on project", normalizeNonBillableItem);
}

export function parseTalentPoolDashboard(res: ApiEnvelope<unknown>): TalentPoolDashboardData {
  const data = (res.data ?? {}) as Record<string, unknown>;
  const onBenchRaw = (data.on_bench ?? data.onBench ?? {}) as Record<string, unknown>;
  const unallocatedRaw = (data.unallocated ?? {}) as Record<string, unknown>;
  const nonBillableRaw = (data.non_billable ?? data.nonBillable ?? {}) as Record<string, unknown>;

  return {
    label: String(data.label ?? "Talent Pool").trim() || "Talent Pool",
    on_bench: parseTablePage(onBenchRaw, "onBench", "Talent Pool", normalizeOnBenchItem),
    unallocated: parseTablePage(
      unallocatedRaw,
      "unallocated",
      "Not allocated to project",
      normalizeUnallocatedItem
    ),
    non_billable: parseTablePage(
      nonBillableRaw,
      "nonBillable",
      "Non-billable on project",
      normalizeNonBillableItem
    ),
  };
}

export function normalizeBenchForecastItem(raw: Record<string, unknown>): BenchForecastItem {
  const email = String(raw.email ?? raw.employee_email ?? raw.employeeEmail ?? "").trim();
  const managersRaw = raw.manager_names ?? raw.managerNames;
  const manager_names = Array.isArray(managersRaw)
    ? managersRaw.map((m) => String(m).trim()).filter(Boolean)
    : [];

  return {
    name: String(raw.name ?? raw.employee_name ?? raw.employeeName ?? "").trim(),
    email,
    emp_id: (() => {
      const v = String(raw.emp_id ?? raw.empId ?? "").trim();
      return v || null;
    })(),
    project_name: (() => {
      const v = String(raw.project_name ?? raw.projectName ?? "").trim();
      return v || null;
    })(),
    role: (() => {
      const v = String(raw.role ?? "").trim();
      return v || null;
    })(),
    allocation_end_date: (() => {
      const v = String(raw.allocation_end_date ?? raw.allocationEndDate ?? "").trim();
      return v || null;
    })(),
    expected_bench_hours: readOptionalNumber(
      raw.expected_bench_hours ?? raw.expectedBenchHours
    ),
    manager_names,
    allocate_employee_email: email,
  };
}

export function parseBenchForecastPage(res: ApiEnvelope<unknown>): BenchForecastPage {
  const data = (res.data ?? {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  const meta = parsePagedMeta(data, itemsRaw.length);

  return {
    ...meta,
    items: itemsRaw
      .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
      .map(normalizeBenchForecastItem),
  };
}

export function formatTalentPoolPreviousProject(
  code: string | null,
  name: string | null
): string {
  if (name && code) return `${code} — ${name}`;
  return name || code || "—";
}

export function formatTalentPoolDate(value: string | null): string {
  if (!value) return "—";
  return formatApiDateDisplay(value) || value;
}

/** Always `/dashboard/allocation?employeeEmail=…` per API contract. */
export function buildAllocateHref(item: AllocateTarget): string {
  const email = item.allocate_employee_email || item.employee_email;
  if (!email) return DASHBOARD_ROUTES.allocation;
  return `${DASHBOARD_ROUTES.allocation}?employeeEmail=${encodeURIComponent(email)}`;
}

export function formatProjectLabel(code: string | null, name: string | null): string {
  if (name && code) return `${code} — ${name}`;
  return name || code || "—";
}
