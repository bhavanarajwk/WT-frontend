import {
  isManagerFlagTruthy,
  isManagerRoleLabel,
  allocationProjectCode,
} from "@/utils/dashboard/allocationDisplay";
import { formatAllocatedHoursPercentLabel } from "@/utils/dashboard/validation";
import { toPagedRows } from "@/utils/apiRows";

export function normalizeAssignedProjects(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const isManagerRaw = row.is_manager ?? null;
    const isManager =
      isManagerFlagTruthy(isManagerRaw) || isManagerRoleLabel(row.role ?? row.designation)
        ? "Yes"
        : "No";

    return {
      project_code: row.project_code ?? row.projectCode ?? row.code ?? "—",
      project_name: row.project_name ?? row.projectName ?? row.name ?? "—",
      project_type: row.project_type ?? row.projectType ?? "—",
      role: row.role ?? row.designation ?? "—",
      allocated_hours: row.allocated_hours ?? row.allocatedHours ?? row.hours ?? "—",
      billing_status: row.billing_status ?? row.billingStatus ?? "—",
      is_manager: isManager,
      start_date: row.start_date ?? row.startDate ?? "—",
      end_date: row.end_date ?? row.endDate ?? "—",
    } as Record<string, unknown>;
  });
}

export function buildProfileAssignedProjects(
  assignedInput: unknown,
  allocationInput?: unknown
): Array<Record<string, unknown>> {
  const normalizedProjects = normalizeAssignedProjects(toPagedRows(assignedInput));
  if (allocationInput === undefined) {
    return normalizedProjects;
  }
  return mergeProjectAndAllocationData(normalizedProjects, toPagedRows(allocationInput));
}

export function mergeProjectAndAllocationData(
  projectsRows: Array<Record<string, unknown>>,
  allocationRows: Array<Record<string, unknown>>
) {
  const allocationByProject = allocationRows.reduce<Record<string, Record<string, unknown>>>(
    (acc, row) => {
      const key = String(row.project_code ?? row.projectCode ?? "").trim();
      if (!key) return acc;
      const existing = acc[key];
      if (!existing) {
        acc[key] = row;
        return acc;
      }
      const existingIsManager =
        isManagerFlagTruthy(existing.is_manager) ||
        isManagerRoleLabel(existing.role ?? existing.designation);
      const nextIsManager =
        isManagerFlagTruthy(row.is_manager) ||
        isManagerRoleLabel(row.role ?? row.designation);
      acc[key] = nextIsManager && !existingIsManager ? row : existing;
      return acc;
    },
    {}
  );

  return projectsRows.map((row) => {
    const projectKey = String(row.project_code ?? "").trim();
    const allocation = allocationByProject[projectKey] ?? {};
    return {
      ...row,
      role: row.role === "—" ? allocation.role ?? allocation.designation ?? "—" : row.role,
      allocated_hours:
        row.allocated_hours === "—"
          ? allocation.allocated_hours ?? allocation.allocatedHours ?? allocation.hours ?? "—"
          : row.allocated_hours,
      billing_status:
        row.billing_status === "—"
          ? allocation.billing_status ?? allocation.billingStatus ?? "—"
          : row.billing_status,
      is_manager:
        row.is_manager === "No" &&
        (allocation.is_manager !== undefined ||
          isManagerRoleLabel(allocation.role ?? allocation.designation))
          ? (() => {
              const raw = allocation.is_manager;
              return isManagerFlagTruthy(raw) ||
                isManagerRoleLabel(allocation.role ?? allocation.designation)
                ? "Yes"
                : "No";
            })()
          : row.is_manager,
      start_date:
        row.start_date === "—"
          ? allocation.start_date ?? allocation.startDate ?? "—"
          : row.start_date,
      end_date:
        row.end_date === "—"
          ? allocation.end_date ?? allocation.endDate ?? "—"
          : row.end_date,
    } as Record<string, unknown>;
  });
}

export function managerProjectCode(row: Record<string, unknown>) {
  const nestedProject = row.project as Record<string, unknown> | undefined;
  return String(
    row.project_code ??
      row.projectCode ??
      row.project_code_id ??
      row.projectCodeId ??
      row.allocated_project ??
      row.code ??
      nestedProject?.project_code ??
      nestedProject?.projectCode ??
      nestedProject?.code ??
      row.project_id ??
      row.projectId ??
      ""
  ).trim();
}

export function managerProjectName(row: Record<string, unknown>) {
  const nestedProject = row.project as Record<string, unknown> | undefined;
  return String(
    row.project_name ??
      row.projectName ??
      row.name ??
      row.allocated_project_name ??
      nestedProject?.project_name ??
      nestedProject?.projectName ??
      nestedProject?.name ??
      ""
  ).trim();
}

export function managerTeamEmails(rows: Array<Record<string, unknown>>) {
  return Array.from(
    new Set(
      rows
        .flatMap((row) => {
          const direct = String(
            row.employee_email ?? row.email ?? row.user_email ?? row.userEmail ?? ""
          )
            .trim()
            .toLowerCase();
          const nestedEmployees = Array.isArray(row.employees)
            ? (row.employees as Array<Record<string, unknown>>)
                .map((emp) =>
                  String(emp.email ?? emp.user_email ?? emp.userEmail ?? "")
                    .trim()
                    .toLowerCase()
                )
                .filter(Boolean)
            : [];
          return [direct, ...nestedEmployees];
        })
        .filter(Boolean)
    )
  );
}

export function managerTeamRowsForProject(
  rows: Array<Record<string, unknown>>,
  projectCode: string
) {
  const normalizedCode = projectCode.trim().toLowerCase();
  if (!normalizedCode) return [];
  return rows
    .filter((row) => managerProjectCode(row).trim().toLowerCase() === normalizedCode)
    .flatMap((row) => {
      const nestedEmployees = Array.isArray(row.employees)
        ? (row.employees as Array<Record<string, unknown>>)
        : [];
      const nestedUser =
        (row.user as Record<string, unknown> | undefined) ??
        (row.employee as Record<string, unknown> | undefined) ??
        (row.member as Record<string, unknown> | undefined) ??
        (row.user_master as Record<string, unknown> | undefined) ??
        (row.userMaster as Record<string, unknown> | undefined);
      const projectName = managerProjectName(row);
      const projectType = String(
        row.project_type ??
          row.projectType ??
          row.type ??
          (row.project as Record<string, unknown> | undefined)?.project_type ??
          (row.project as Record<string, unknown> | undefined)?.projectType ??
          "—"
      ).trim();
      const employeeFromRow = String(
        row.employee_name ??
          row.employeeName ??
          row.emp_name ??
          row.empName ??
          row.name ??
          row.user_name ??
          row.userName ??
          nestedUser?.name ??
          nestedUser?.employee_name ??
          nestedUser?.employeeName ??
          row.email ??
          row.user_email ??
          ""
      ).trim();
      const emailFromRow = String(
        row.email ??
          row.user_email ??
          row.userEmail ??
          row.employee_email ??
          row.employeeEmail ??
          row.emp_email ??
          row.empEmail ??
          nestedUser?.email ??
          nestedUser?.user_email ??
          nestedUser?.userEmail ??
          ""
      ).trim();
      const roleFromRow = String(
        row.role ??
          row.designation ??
          row.employee_role ??
          row.employeeRole ??
          nestedUser?.role ??
          nestedUser?.designation ??
          "—"
      ).trim();
      if (nestedEmployees.length) {
        return nestedEmployees.map((emp) => ({
          project_code: managerProjectCode(row) || "—",
          project_name: projectName || "—",
          project_type: projectType || "—",
          employee: String(emp.name ?? emp.employee_name ?? emp.employeeName ?? "—").trim() || "—",
          email: String(emp.email ?? emp.user_email ?? emp.userEmail ?? "—").trim() || "—",
          role: String(emp.project_role ?? emp.role ?? emp.designation ?? "—").trim() || "—",
          allocated_hours: formatAllocatedHoursPercentLabel(
            emp.allocated_hours ?? emp.allocatedHours ?? row.allocated_hours
          ),
          allocation_type: String(emp.allocation_type ?? emp.allocationType ?? row.allocation_type ?? "—").trim(),
          is_manager: String(emp.is_manager ?? emp.isManager ?? row.is_manager ?? "—").trim(),
          start_date: String(emp.start_date ?? emp.startDate ?? row.start_date ?? "—").trim(),
          end_date: String(emp.end_date ?? emp.endDate ?? row.end_date ?? "—").trim(),
        }));
      }
      return [
        {
          project_code: managerProjectCode(row) || "—",
          project_name: projectName || "—",
          project_type: projectType || "—",
          employee: employeeFromRow || "—",
          email: emailFromRow || "—",
          role: roleFromRow || "—",
          allocated_hours: formatAllocatedHoursPercentLabel(
            row.allocated_hours ?? row.allocatedHours ?? row.hours
          ),
          allocation_type: String(row.allocation_type ?? row.allocationType ?? "—").trim(),
          is_manager: String(row.is_manager ?? row.isManager ?? "—").trim(),
          start_date: String(row.start_date ?? row.startDate ?? "—").trim(),
          end_date: String(row.end_date ?? row.endDate ?? "—").trim(),
        },
      ];
    })
    .filter((row) => row.employee !== "—" || row.email !== "—");
}
