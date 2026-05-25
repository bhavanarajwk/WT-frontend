import { formatAllocatedHoursPercentLabel } from "@/utils/dashboard/validation";

export function isManagerFlagTruthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  if (["true", "yes", "y", "1", "manager"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;
  return false;
}

export function isManagerRoleLabel(value: unknown): boolean {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .includes("manager");
}

export function buildUserIdToNameMap(users: Array<Record<string, unknown>>) {
  const map: Record<string, string> = {};
  for (const u of users) {
    const name = String(u.name ?? "").trim();
    if (!name) continue;
    for (const key of ["id", "user_id", "userId", "userID", "emp_id"] as const) {
      const v = u[key];
      if (v != null && v !== "") map[String(v)] = name;
    }
  }
  return map;
}

export function buildEmailToNameMap(users: Array<Record<string, unknown>>) {
  const map: Record<string, string> = {};
  for (const u of users) {
    const email = String(u.email ?? "").trim().toLowerCase();
    const name = String(u.name ?? "").trim();
    if (email && name) map[email] = name;
  }
  return map;
}

export function allocationRowEmail(row: Record<string, unknown>) {
  return String(
    row.employee_email ??
      row.employeeEmail ??
      row.user_email ??
      row.userEmail ??
      row.email ??
      ""
  )
    .trim()
    .toLowerCase();
}

/** Raw project code from allocation row (may be empty). */
export function allocationProjectCode(row: Record<string, unknown>): string {
  const direct =
    row.project_code ??
    row.projectCode ??
    row.project_id ??
    row.projectId ??
    row.proj_code ??
    row.projCode;
  if (direct != null && direct !== "") return String(direct).trim();
  for (const key of Object.keys(row)) {
    const norm = key.toLowerCase().replace(/-/g, "_");
    if (
      norm === "project_code" ||
      norm === "project_id" ||
      norm === "projectcode" ||
      norm === "projectid"
    ) {
      const v = row[key];
      if (v != null && v !== "") return String(v).trim();
    }
  }
  return "";
}

export function allocationProjectTitleFromRow(row: Record<string, unknown>) {
  return String(
    row.project_name ?? row.projectName ?? row.project_title ?? row.projectTitle ?? ""
  ).trim();
}

export function buildProjectCodeDisplayMap(projectRows: Array<Record<string, unknown>>) {
  const map: Record<string, string> = {};
  for (const p of projectRows) {
    const code = String(p.project_code ?? p.projectCode ?? "").trim();
    if (!code) continue;
    const name = String(p.project_name ?? p.projectName ?? "").trim();
    map[code] = name ? `${code} — ${name}` : code;
  }
  return map;
}

export function enrichAllocationRowsForDisplay(
  rows: Array<Record<string, unknown>>,
  ctx: {
    userIdToName: Record<string, string>;
    emailToName: Record<string, string>;
    projectDisplayByCode: Record<string, string>;
  }
) {
  const { userIdToName, emailToName, projectDisplayByCode } = ctx;
  return rows.map((row) => {
    const uidRaw = row.user_id ?? row.userId ?? row.userID;
    const uid = uidRaw != null && uidRaw !== "" ? String(uidRaw).trim() : "";
    const email = allocationRowEmail(row);

    const fromRow = String(
      row.employee_name ??
        row.employeeName ??
        row.user_name ??
        row.userName ??
        ""
    ).trim();

    let employee_name =
      (uid && userIdToName[uid]) || (email && emailToName[email]) || fromRow;
    if (!employee_name && email) employee_name = email;
    if (!employee_name && uid) employee_name = `Employee #${uid}`;
    if (!employee_name) employee_name = "Employee (unresolved)";

    const code = allocationProjectCode(row);
    const titleOnRow = allocationProjectTitleFromRow(row);
    let allocated_project = "";
    if (code) {
      allocated_project =
        projectDisplayByCode[code] ?? (titleOnRow ? `${code} — ${titleOnRow}` : code);
    } else if (titleOnRow) {
      allocated_project = titleOnRow;
    } else {
      allocated_project = "Project (no code on record)";
    }

    return { ...row, employee_name, allocated_project };
  });
}

export function normalizeForecastRows(
  rows: Array<Record<string, unknown>>,
  ctx: {
    emailToName: Record<string, string>;
    projectDisplayByCode: Record<string, string>;
  }
) {
  const { emailToName, projectDisplayByCode } = ctx;
  return rows.map((row) => {
    const email = allocationRowEmail(row);
    const employeeName = String(
      row.employee_name ??
        row.employeeName ??
        row.user_name ??
        row.userName ??
        (email ? emailToName[email] : "") ??
        ""
    ).trim();

    const code = allocationProjectCode(row) || String(row.project_code ?? row.projectCode ?? "").trim();
    const titleOnRow = allocationProjectTitleFromRow(row);
    const mapped = code ? projectDisplayByCode[code] ?? "" : "";
    const mappedName = mapped.includes("—")
      ? mapped.split("—").slice(1).join("—").trim()
      : mapped.trim();
    const projectName = String(
      row.project_name ?? row.projectName ?? titleOnRow ?? mappedName ?? ""
    ).trim();

    return {
      ...row,
      project_code: code || "—",
      project_name: projectName || "—",
      employee_name: employeeName || "—",
      employee_email: email || "—",
      role: String(row.role ?? row.project_role ?? row.projectRole ?? row.designation ?? "—").trim() || "—",
      billing_status: String(row.billing_status ?? row.billingStatus ?? "—").trim() || "—",
      end_date: String(row.end_date ?? row.endDate ?? "—").trim() || "—",
    } as Record<string, unknown>;
  });
}
