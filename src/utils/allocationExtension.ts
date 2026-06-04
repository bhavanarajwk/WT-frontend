import type {
  AllocationExtensionRequestRow,
  AllocationExtensionRequestStatus,
} from "@/services/hrms.service";
import type { ApiEnvelope } from "@/api/httpClient";
import { formatApiDate, inputValueToApiDate, parseApiDate } from "@/utils/apiDate";
import { cleanEmployeeName } from "@/utils/employeeDirectory";

export type AllocationExtensionContext = {
  allocation_id: number | null;
  employee_name: string;
  employee_email: string;
  project_code: string;
  project_name: string;
  start_date: string | null;
  current_end_date: string | null;
  current_allocated_percent: number | null;
  minimum_requested_end_date: string | null;
  min_extension_days: number;
  extension_allowed: boolean;
};

export type ManagerExtensionEmployee = {
  email: string;
  name: string;
  current_end_date: string | null;
  allocated_percent: number | null;
};

export type ManagerExtensionProject = {
  code: string;
  name: string;
  id: number | null;
  employees: ManagerExtensionEmployee[];
};

export type AllocationExtensionContextQuery = {
  userEmail: string;
  projectCode?: string;
  projectId?: number;
};

/** Build GET context query from form project dropdown value (code or numeric id). */
export function buildAllocationExtensionContextQuery(params: {
  userEmail: string;
  projectValue: string;
}): AllocationExtensionContextQuery | null {
  const userEmail = params.userEmail.trim();
  const projectValue = params.projectValue.trim();
  if (!userEmail || !projectValue) return null;
  if (/^\d+$/.test(projectValue)) {
    return { userEmail, projectId: Number(projectValue) };
  }
  return { userEmail, projectCode: projectValue };
}

/** POST body projectCode: use canonical code from context when dropdown value is numeric id. */
export function resolveExtensionProjectCodeForSubmit(
  projectValue: string,
  context: AllocationExtensionContext | null
): string {
  const trimmed = projectValue.trim();
  if (!trimmed) return "";
  if (/^\d+$/.test(trimmed) && context?.project_code) {
    return context.project_code;
  }
  return trimmed;
}

function readAllocationEndDate(raw: Record<string, unknown>): string | null {
  const value = String(
    raw.current_end_date ??
      raw.currentEndDate ??
      raw.end_date ??
      raw.endDate ??
      ""
  ).trim();
  return value && value !== "—" ? value : null;
}

function readStartDate(raw: Record<string, unknown>): string | null {
  const value = String(raw.start_date ?? raw.startDate ?? "").trim();
  return value && value !== "—" ? value : null;
}

function readAllocatedPercent(raw: Record<string, unknown>): number | null {
  const rawPct =
    raw.current_allocated_percent ??
    raw.currentAllocatedPercent ??
    raw.allocated_percent ??
    raw.allocatedPercent ??
    raw.allocation_percent;
  const n = Number(rawPct);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const DEFAULT_MIN_EXTENSION_DAYS = 7;

/** Parse GET /manager-projects-with-roles for extension request form. */
export function parseManagerProjectsForExtension(payload: unknown): ManagerExtensionProject[] {
  const root = (payload as { data?: unknown })?.data ?? payload;
  const record = (root && typeof root === "object" ? root : {}) as Record<string, unknown>;
  const projectsRaw =
    (Array.isArray(record.projects) ? record.projects : undefined) ??
    (Array.isArray((record.data as { projects?: unknown })?.projects)
      ? (record.data as { projects: unknown[] }).projects
      : undefined) ??
    [];

  const projectMap = new Map<string, ManagerExtensionProject>();

  for (const project of projectsRaw) {
    if (!project || typeof project !== "object") continue;
    const p = project as Record<string, unknown>;
    const code = String(p.project_code ?? p.projectCode ?? "").trim();
    const idRaw = Number(p.project_id ?? p.projectId ?? 0);
    const id = Number.isFinite(idRaw) && idRaw > 0 ? idRaw : null;
    if (!code && id == null) continue;
    const key = (code || String(id)).toLowerCase();
    const name =
      String(p.project_name ?? p.projectName ?? (code || String(id))).trim() ||
      code ||
      String(id);
    const existing = projectMap.get(key) ?? { code: code || String(id), name, id, employees: [] };
    const employeeMap = new Map(
      existing.employees.map((e) => [e.email.toLowerCase(), e] as const)
    );

    const employees = Array.isArray(p.employees)
      ? (p.employees as Array<Record<string, unknown>>)
      : [];
    for (const emp of employees) {
      const email = String(emp.email ?? emp.user_email ?? emp.userEmail ?? "")
        .trim()
        .toLowerCase();
      if (!email) continue;
      const nameLabel = cleanEmployeeName({
        name: String(emp.name ?? emp.employee_name ?? emp.employeeName ?? "Employee"),
      });
      employeeMap.set(email, {
        email,
        name: nameLabel,
        current_end_date: readAllocationEndDate(emp),
        allocated_percent: readAllocatedPercent(emp),
      });
    }

    projectMap.set(key, {
      code: code || String(id),
      name,
      id: id ?? existing.id,
      employees: Array.from(employeeMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    });
  }

  return Array.from(projectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function findManagerExtensionProject(
  projects: ManagerExtensionProject[],
  projectValue: string
): ManagerExtensionProject | undefined {
  const value = projectValue.trim();
  if (!value) return undefined;
  if (/^\d+$/.test(value)) {
    const id = Number(value);
    return projects.find((p) => p.id === id);
  }
  const code = value.toLowerCase();
  return projects.find((p) => p.code.toLowerCase() === code);
}

export function findExtensionAllocationContext(
  projects: ManagerExtensionProject[],
  userEmail: string,
  projectValue: string
): AllocationExtensionContext | null {
  const email = userEmail.trim().toLowerCase();
  if (!email || !projectValue.trim()) return null;

  const project = findManagerExtensionProject(projects, projectValue);
  const employee = project?.employees.find((e) => e.email === email);
  if (!project || !employee) return null;

  const currentEnd = employee.current_end_date;
  const minimum = currentEnd
    ? addCalendarDaysToApiDate(currentEnd, DEFAULT_MIN_EXTENSION_DAYS)
    : null;

  return {
    allocation_id: null,
    employee_name: employee.name,
    employee_email: email,
    project_code: project.code,
    project_name: project.name,
    start_date: null,
    current_end_date: currentEnd,
    current_allocated_percent: employee.allocated_percent,
    minimum_requested_end_date: minimum,
    min_extension_days: DEFAULT_MIN_EXTENSION_DAYS,
    extension_allowed: Boolean(currentEnd),
  };
}

export function normalizeAllocationExtensionContext(
  raw: Record<string, unknown>
): AllocationExtensionContext {
  const currentEnd = readAllocationEndDate(raw);
  const minDaysRaw = Number(raw.min_extension_days ?? raw.minExtensionDays ?? DEFAULT_MIN_EXTENSION_DAYS);
  const minExtensionDays =
    Number.isFinite(minDaysRaw) && minDaysRaw > 0 ? minDaysRaw : DEFAULT_MIN_EXTENSION_DAYS;
  const minimumFromApi = String(
    raw.minimum_requested_end_date ??
      raw.minimumRequestedEndDate ??
      raw.earliest_requested_end_date ??
      raw.earliestRequestedEndDate ??
      ""
  ).trim();
  const minimum =
    minimumFromApi ||
    (currentEnd ? addCalendarDaysToApiDate(currentEnd, minExtensionDays) : null);
  const extensionAllowedRaw =
    raw.extension_allowed ?? raw.extensionAllowed ?? raw.can_request_extension ?? raw.canRequestExtension;
  const extension_allowed =
    extensionAllowedRaw === undefined || extensionAllowedRaw === null
      ? Boolean(currentEnd)
      : Boolean(extensionAllowedRaw);

  return {
    allocation_id: (() => {
      const id = Number(raw.allocation_id ?? raw.allocationId ?? 0);
      return Number.isFinite(id) && id > 0 ? id : null;
    })(),
    employee_name: String(raw.employee_name ?? raw.employeeName ?? "").trim(),
    employee_email: String(raw.employee_email ?? raw.employeeEmail ?? "").trim(),
    project_code: String(raw.project_code ?? raw.projectCode ?? "").trim(),
    project_name: String(raw.project_name ?? raw.projectName ?? "").trim(),
    start_date: readStartDate(raw),
    current_end_date: currentEnd,
    current_allocated_percent: readAllocatedPercent(raw),
    minimum_requested_end_date: minimum,
    min_extension_days: minExtensionDays,
    extension_allowed,
  };
}

export function addCalendarDaysToApiDate(apiDate: string, days: number): string | null {
  const parsed = parseApiDate(apiDate);
  if (!parsed) return null;
  const next = new Date(parsed);
  next.setDate(next.getDate() + days);
  return formatApiDate(next);
}

function normalizeStatus(value: unknown): AllocationExtensionRequestStatus {
  const v = String(value ?? "PENDING").trim().toUpperCase();
  if (v === "APPROVED" || v === "REJECTED" || v === "PENDING") return v;
  return "PENDING";
}

/** Map GET list item (camelCase or snake_case) to UI row. */
export function normalizeAllocationExtensionRow(
  raw: Record<string, unknown>
): AllocationExtensionRequestRow {
  const currentEnd = String(raw.current_end_date ?? raw.currentEndDate ?? "").trim();
  const extensionRaw = raw.extension_days ?? raw.extensionDays;
  const extensionDays =
    typeof extensionRaw === "number" && Number.isFinite(extensionRaw)
      ? extensionRaw
      : Number.parseInt(String(extensionRaw ?? ""), 10);

  return {
    id: Number(raw.id ?? 0),
    employee_name: String(raw.employee_name ?? raw.employeeName ?? "").trim(),
    employee_email: String(raw.employee_email ?? raw.employeeEmail ?? "").trim(),
    project_code: String(raw.project_code ?? raw.projectCode ?? "").trim(),
    project_name: String(raw.project_name ?? raw.projectName ?? "").trim(),
    current_end_date: currentEnd || null,
    requested_end_date: String(raw.requested_end_date ?? raw.requestedEndDate ?? "").trim(),
    extension_days: Number.isFinite(extensionDays) ? extensionDays : null,
    current_allocated_percent: Number(
      raw.current_allocated_percent ?? raw.currentAllocatedPercent ?? 0
    ),
    requested_allocated_percent: Number(
      raw.requested_allocated_percent ?? raw.requestedAllocatedPercent ?? 0
    ),
    reason: raw.reason == null || raw.reason === "" ? null : String(raw.reason),
    requested_by_name: String(raw.requested_by_name ?? raw.requestedByName ?? "").trim(),
    status: normalizeStatus(raw.status),
    reviewed_by_name: (() => {
      const v = String(raw.reviewed_by_name ?? raw.reviewedByName ?? "").trim();
      return v || null;
    })(),
    reviewed_at: (() => {
      const v = String(raw.reviewed_at ?? raw.reviewedAt ?? "").trim();
      return v || null;
    })(),
    created_at: String(raw.created_at ?? raw.createdAt ?? "").trim(),
    updated_at: (() => {
      const v = String(raw.updated_at ?? raw.updatedAt ?? "").trim();
      return v || null;
    })(),
  };
}

/** Apply PUT /status response onto an existing list row (keeps row visible after HR action). */
export function mergeAllocationExtensionRowFromStatusResponse(
  row: AllocationExtensionRequestRow,
  data: unknown,
  fallbackStatus: AllocationExtensionRequestStatus
): AllocationExtensionRequestRow {
  if (data == null || typeof data !== "object") {
    return { ...row, status: fallbackStatus };
  }
  const patch = data as Record<string, unknown>;
  const merged = normalizeAllocationExtensionRow({
    ...patch,
    id: row.id,
    employee_name: patch.employee_name ?? patch.employeeName ?? row.employee_name,
    employee_email: patch.employee_email ?? patch.employeeEmail ?? row.employee_email,
    project_code: patch.project_code ?? patch.projectCode ?? row.project_code,
    project_name: patch.project_name ?? patch.projectName ?? row.project_name,
    current_end_date: patch.current_end_date ?? patch.currentEndDate ?? row.current_end_date,
    requested_end_date:
      patch.requested_end_date ?? patch.requestedEndDate ?? row.requested_end_date,
    requested_by_name: patch.requested_by_name ?? patch.requestedByName ?? row.requested_by_name,
    created_at: patch.created_at ?? patch.createdAt ?? row.created_at,
  });
  return {
    ...row,
    ...merged,
    id: row.id,
    employee_name: merged.employee_name || row.employee_name,
    employee_email: merged.employee_email || row.employee_email,
    project_code: merged.project_code || row.project_code,
    project_name: merged.project_name || row.project_name,
    requested_end_date: merged.requested_end_date || row.requested_end_date,
    requested_by_name: merged.requested_by_name || row.requested_by_name,
    created_at: merged.created_at || row.created_at,
    status: merged.status || fallbackStatus,
    reviewed_by_name: merged.reviewed_by_name ?? row.reviewed_by_name,
    reviewed_at: merged.reviewed_at ?? row.reviewed_at,
    updated_at: merged.updated_at ?? row.updated_at,
  };
}

export type AllocationExtensionListPage = {
  current_page: number;
  total_pages: number;
  page_size: number;
  total_elements: number;
  data: AllocationExtensionRequestRow[];
};

export function parseAllocationExtensionListResponse(
  res: ApiEnvelope<unknown>
): AllocationExtensionListPage {
  const page = (res.data ?? {}) as Record<string, unknown>;
  const rowsRaw = Array.isArray(page.data) ? page.data : [];

  const current_page = Number(page.current_page ?? page.currentPage ?? 0);
  const total_pages = Number(page.total_pages ?? page.totalPages ?? 1);
  const page_size = Number(page.page_size ?? page.pageSize ?? 10);
  const total_elements = Number(page.total_elements ?? page.totalElements ?? rowsRaw.length);

  return {
    current_page: Number.isFinite(current_page) ? current_page : 0,
    total_pages: Number.isFinite(total_pages) && total_pages > 0 ? total_pages : 1,
    page_size: Number.isFinite(page_size) ? page_size : 10,
    total_elements: Number.isFinite(total_elements) ? total_elements : rowsRaw.length,
    data: rowsRaw
      .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
      .map(normalizeAllocationExtensionRow),
  };
}

export function buildCreateAllocationExtensionBody(payload: {
  userEmail: string;
  projectCode: string;
  requestedEndDate: string;
  reason?: string;
}): {
  userEmail: string;
  projectCode: string;
  requestedEndDate: string;
  reason?: string;
} {
  const userEmail = payload.userEmail.trim();
  const projectCode = payload.projectCode.trim();
  const requestedEndDate = inputValueToApiDate(payload.requestedEndDate.trim());
  const reason = payload.reason?.trim();
  return {
    userEmail,
    projectCode,
    requestedEndDate,
    ...(reason ? { reason } : {}),
  };
}
