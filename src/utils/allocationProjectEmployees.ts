import { toRows } from "@/utils/apiRows";

export type AllocationProjectEmployee = {
  employeeEmail: string;
  employeeName: string;
  userId?: number;
  empId?: string;
};

/** Parse GET /allocation/project-employees → data.items */
export function parseAllocationProjectEmployees(data: unknown): AllocationProjectEmployee[] {
  const rows = toRows(data);
  const seen = new Set<string>();
  const out: AllocationProjectEmployee[] = [];

  for (const row of rows) {
    const email = String(
      row.employeeEmail ?? row.employee_email ?? row.userEmail ?? row.user_email ?? row.email ?? ""
    )
      .trim()
      .toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const name = String(
      row.employeeName ?? row.employee_name ?? row.name ?? row.user_name ?? row.userName ?? email
    ).trim();
    const userIdRaw = row.userId ?? row.user_id;
    const userId =
      userIdRaw !== undefined && userIdRaw !== null && userIdRaw !== ""
        ? Number(userIdRaw)
        : undefined;
    out.push({
      employeeEmail: email,
      employeeName: name || email,
      userId: Number.isFinite(userId) ? userId : undefined,
      empId: String(row.empId ?? row.emp_id ?? "").trim() || undefined,
    });
  }

  return out.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}
