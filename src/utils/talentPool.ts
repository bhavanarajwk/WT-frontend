import type { ApiEnvelope } from "@/api/httpClient";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { formatApiDateDisplay } from "@/utils/apiDate";

export type TalentPoolTableKey = "unallocated";

export type AllocateTarget = {
  employee_email: string;
  allocate_employee_email: string;
};

/** GET /allocation/talent-pool — unallocated / not on client project. */
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

export type TalentPoolTablePage<T> = {
  label: string;
  table_key: string;
  current_page: number;
  total_pages: number;
  page_size: number;
  total_elements: number;
  items: T[];
};

export type TalentPoolDashboardData = {
  label: string;
  unallocated: TalentPoolTablePage<UnallocatedTalentPoolItem>;
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

function parseUnallocatedTablePage(data: Record<string, unknown>): TalentPoolTablePage<UnallocatedTalentPoolItem> {
  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  const meta = parsePagedMeta(data, itemsRaw.length);
  const keyRaw = String(data.table_key ?? data.tableKey ?? "unallocated").trim();

  return {
    label: String(data.label ?? "Not allocated to project").trim() || "Not allocated to project",
    table_key: keyRaw || "unallocated",
    ...meta,
    items: itemsRaw
      .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
      .map(normalizeUnallocatedItem),
  };
}

export function parseUnallocatedPage(
  res: ApiEnvelope<unknown>
): TalentPoolTablePage<UnallocatedTalentPoolItem> {
  const data = (res.data ?? {}) as Record<string, unknown>;
  return parseUnallocatedTablePage(data);
}

export function parseTalentPoolDashboard(res: ApiEnvelope<unknown>): TalentPoolDashboardData {
  const data = (res.data ?? {}) as Record<string, unknown>;
  const unallocatedRaw = (data.unallocated ?? data) as Record<string, unknown>;

  return {
    label: String(data.label ?? "Talent Pool").trim() || "Talent Pool",
    unallocated: parseUnallocatedTablePage(unallocatedRaw),
  };
}

export function dashboardFromUnallocatedPage(
  page: TalentPoolTablePage<UnallocatedTalentPoolItem>
): TalentPoolDashboardData {
  return {
    label: "Talent Pool",
    unallocated: page,
  };
}

export function formatTalentPoolPreviousProject(
  _code: string | null,
  name: string | null
): string {
  return name || "—";
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
