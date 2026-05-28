import {
  allocationProjectCode,
  allocationRowEmail,
  isManagerFlagTruthy,
} from "@/utils/dashboard/allocationDisplay";

/** Build id / emp_id / user_id → email from user or onboard rows. */
export function buildUserIdEmailMap(rows: Array<Record<string, unknown>>): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const email = emailFromUserRecord(row);
    if (!email) continue;
    const normalized = email.toLowerCase();
    for (const key of [
      "id",
      "user_id",
      "userId",
      "emp_id",
      "empId",
      "employee_id",
      "employeeId",
    ] as const) {
      const id = String(row[key] ?? "").trim();
      if (id) map.set(id, normalized);
    }
  }
  return map;
}

export function emailFromUserRecord(r: Record<string, unknown> | null | undefined): string {
  if (!r) return "";
  const direct = String(
    r.email ?? r.user_email ?? r.userEmail ?? r.employee_email ?? r.employeeEmail ?? ""
  ).trim();
  if (direct) {
    return direct.toLowerCase().startsWith("email:") ? direct.slice(6).trim() : direct;
  }
  const name = String(r.name ?? "").trim();
  const fromName = name.match(/\(([^()@\s]+@[^()@\s]+\.[^()@\s]+)\)\s*$/)?.[1];
  if (fromName) return fromName.trim();
  return "";
}

export function emailFromUserId(
  userId: string | number | null | undefined,
  map: Map<string, string>
): string {
  const id = String(userId ?? "").trim();
  if (!id) return "";
  return map.get(id) ?? "";
}

export function accountManagerUserIdFromRow(row: Record<string, unknown>): string {
  const nestedProject = row.project as Record<string, unknown> | undefined;
  const nestedAm = row.account_manager as Record<string, unknown> | undefined;
  const nestedUser = row.account_manager_user as Record<string, unknown> | undefined;
  const nestedPm = row.project_manager as Record<string, unknown> | undefined;
  const raw =
    row.account_manager_user_id ??
    row.accountManagerUserId ??
    row.account_manager_id ??
    row.accountManagerId ??
    row.project_manager_user_id ??
    row.projectManagerUserId ??
    row.manager_user_id ??
    row.managerUserId ??
    nestedProject?.account_manager_user_id ??
    nestedProject?.accountManagerUserId ??
    nestedProject?.account_manager_id ??
    nestedProject?.project_manager_user_id ??
    nestedAm?.id ??
    nestedAm?.user_id ??
    nestedAm?.userId ??
    nestedUser?.id ??
    nestedUser?.user_id ??
    nestedPm?.id ??
    nestedPm?.user_id;
  return String(raw ?? "").trim();
}

export function accountManagerEmailFromRow(row: Record<string, unknown>): string {
  const nestedProject = row.project as Record<string, unknown> | undefined;
  const nestedAm = row.account_manager as Record<string, unknown> | undefined;
  const nestedPm = row.project_manager as Record<string, unknown> | undefined;
  const raw = String(
    row.manager_comp_off_email ??
      row.managerCompOffEmail ??
      row.manager_email ??
      row.managerEmail ??
      row.project_manager_email ??
      row.projectManagerEmail ??
      row.account_manager_email ??
      row.accountManagerEmail ??
      row.acc_manager_email ??
      row.accManagerEmail ??
      nestedProject?.manager_comp_off_email ??
      nestedProject?.manager_email ??
      nestedProject?.account_manager_email ??
      nestedProject?.accountManagerEmail ??
      nestedAm?.email ??
      nestedAm?.user_email ??
      nestedAm?.userEmail ??
      nestedPm?.email ??
      nestedPm?.user_email ??
      ""
  )
    .trim()
    .toLowerCase();
  return raw.includes("@") ? raw : "";
}

export function isProjectManagerAllocationRow(row: Record<string, unknown>): boolean {
  if (isManagerFlagTruthy(row.is_manager ?? row.isManager)) return true;
  const fields = [row.role, row.designation, row.department, row.job_title, row.title].map((v) =>
    String(v ?? "").trim().toLowerCase()
  );
  return fields.some(
    (f) =>
      f.includes("project manager") ||
      f === "pm" ||
      (f.includes("manager") && !f.includes("account manager"))
  );
}

export function rowMatchesProjectCode(row: Record<string, unknown>, projectCode: string): boolean {
  return allocationProjectCode(row).toLowerCase() === projectCode.trim().toLowerCase();
}

/** PM email from an allocation row on the same project (is_manager / PM role). */
export function projectManagerEmailFromAllocationRows(
  projectCode: string,
  allocationRows: Array<Record<string, unknown>>
): string {
  const code = projectCode.trim().toLowerCase();
  if (!code) return "";
  for (const row of allocationRows) {
    if (!rowMatchesProjectCode(row, code)) continue;
    if (!isProjectManagerAllocationRow(row)) continue;
    const email = allocationRowEmail(row);
    if (email.includes("@")) return email;
  }
  return "";
}

export type ManagerContact = { email?: string; userId?: string };

/** Walk API JSON for account_manager_user_id or manager email (nested project objects). */
export function deepFindManagerContact(root: unknown, depth = 0): ManagerContact {
  if (depth > 10 || root == null || typeof root !== "object") return {};
  if (Array.isArray(root)) {
    for (const item of root) {
      const found = deepFindManagerContact(item, depth + 1);
      if (found.email || found.userId) return found;
    }
    return {};
  }
  const row = root as Record<string, unknown>;
  const email = accountManagerEmailFromRow(row);
  const userId = accountManagerUserIdFromRow(row);
  if (email) return { email };
  if (userId) return { userId };
  for (const value of Object.values(row)) {
    if (value && typeof value === "object") {
      const found = deepFindManagerContact(value, depth + 1);
      if (found.email || found.userId) return found;
    }
  }
  return {};
}

export function unwrapApiData(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  if (o.email || o.account_manager_user_id || o.accountManagerUserId || o.project_code) {
    return o;
  }
  const data = o.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return unwrapApiData(data);
  }
  return o;
}
