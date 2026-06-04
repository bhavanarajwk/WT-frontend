import { toRows } from "@/utils/apiRows";

export type AllocationEmployeeOption = {
  employeeEmail: string;
  employeeName: string;
  userId?: number;
  empId?: string;
  role?: string;
};

/** Parse GET /allocation/employees → data.items */
export function parseAllocationEmployees(data: unknown): AllocationEmployeeOption[] {
  const rows = toRows(data);
  const seen = new Set<string>();
  const out: AllocationEmployeeOption[] = [];

  for (const row of rows) {
    const email = String(
      row.employeeEmail ??
        row.employee_email ??
        row.userEmail ??
        row.user_email ??
        row.email ??
        ""
    )
      .trim()
      .toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const name = String(
      row.employeeName ??
        row.employee_name ??
        row.name ??
        row.user_name ??
        row.userName ??
        email
    ).trim();
    const userIdRaw = row.userId ?? row.user_id;
    const userId =
      userIdRaw !== undefined && userIdRaw !== null && userIdRaw !== ""
        ? Number(userIdRaw)
        : undefined;
    const role = String(row.role ?? row.designation ?? row.project_role ?? "").trim();
    out.push({
      employeeEmail: email,
      employeeName: name || email,
      userId: Number.isFinite(userId) ? userId : undefined,
      empId: String(row.empId ?? row.emp_id ?? "").trim() || undefined,
      ...(role ? { role } : {}),
    });
  }

  return out.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export function allocationEmployeesToPickerUsers(
  employees: AllocationEmployeeOption[]
): Array<{ name: string; email: string; role?: string }> {
  return employees.map((e) => ({
    name: e.employeeName,
    email: e.employeeEmail,
    ...(e.role ? { role: e.role } : {}),
  }));
}
