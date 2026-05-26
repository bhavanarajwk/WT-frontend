import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import { rowEmail } from "@/utils/employeeDirectory";

/** Backend caps timelog list `size` at 200. */
const TIMELOG_PAGE_SIZE = "200";

function normalizeTimelogRow(
  row: Record<string, unknown>,
  fallbackEmail: string
): Record<string, unknown> {
  const projectCode = row.project_code ?? row.projectCode ?? row.project_id ?? row.projectId;
  return {
    ...row,
    employee_email: row.employee_email ?? row.employeeEmail ?? row.email ?? fallbackEmail,
    project_code: projectCode ?? row.project_code,
    log_date: row.log_date ?? row.logDate,
  };
}

/** Load another employee's timelogs via GET /timelog?employee_email=… (HR/Admin). */
export async function fetchHrTimelogsForEmployee(
  employeeEmail: string,
  _options?: { empId?: string }
): Promise<Array<Record<string, unknown>>> {
  const email = employeeEmail.trim().toLowerCase();
  if (!email) return [];

  try {
    const res = await hrmsService.getTimelogs({
      page: "0",
      size: TIMELOG_PAGE_SIZE,
      employee_email: email,
    });
    const rows = toPagedRows((res as { data?: unknown }).data ?? res).map((row) =>
      normalizeTimelogRow(row as Record<string, unknown>, email)
    );
    return rows;
  } catch {
    return [];
  }
}

export async function resolveEmpIdForEmail(employeeEmail: string): Promise<string> {
  const email = employeeEmail.trim().toLowerCase();
  if (!email) return "";
  try {
    const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "200" });
    const rows = toPagedRows(onboardRes.data ?? onboardRes);
    for (const row of rows) {
      const record = row as Record<string, unknown>;
      if (rowEmail(record).trim().toLowerCase() === email) {
        return String(record.emp_id ?? record.empId ?? "").trim();
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}
