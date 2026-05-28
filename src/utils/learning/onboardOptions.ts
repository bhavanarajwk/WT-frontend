import type { OnboardItem } from "@/services/hrms.service";

export type OnboardEmployeeOption = { id: string; label: string; name: string; email: string };

function onboardRowRecord(row: OnboardItem | Record<string, unknown>): Record<string, unknown> {
  return row as Record<string, unknown>;
}

export function normalizePickerEmail(value: string): string {
  const v = value.trim();
  return v.toLowerCase().startsWith("email:") ? v.slice(6).trim() : v;
}

/** Plain email for API payloads and select values (never `email:user@host`). */
export function onboardOptionEmail(opt: Pick<OnboardEmployeeOption, "id" | "label" | "email">): string {
  const direct = normalizePickerEmail(String(opt.email ?? ""));
  if (direct) return direct;

  const id = String(opt.id ?? "").trim();
  if (id.toLowerCase().startsWith("email:")) {
    return id.slice(6).trim();
  }

  const fromLabel = opt.label.match(/\(([^()@\s]+@[^()@\s]+\.[^()@\s]+)\)\s*$/)?.[1];
  return fromLabel?.trim() ?? "";
}

export function emailFromOnboardRow(r: Record<string, unknown>): string {
  const direct = String(
    r.email ?? r.user_email ?? r.userEmail ?? r.employee_email ?? r.employeeEmail ?? ""
  ).trim();
  if (direct) {
    return direct.toLowerCase().startsWith("email:") ? direct.slice(6).trim() : direct;
  }

  const name = String(r.name ?? "").trim();
  const fromName = name.match(/\(([^()@\s]+@[^()@\s]+\.[^()@\s]+)\)\s*$/)?.[1];
  if (fromName) return fromName.trim();

  for (const key of ["user_id", "userId", "id"] as const) {
    const raw = String(r[key] ?? "").trim();
    if (raw.toLowerCase().startsWith("email:")) return raw.slice(6).trim();
  }

  return "";
}

export function isActiveOnboardRow(row: OnboardItem | Record<string, unknown>): boolean {
  const r = onboardRowRecord(row);
  return String(r.status ?? "").trim().toUpperCase() === "ACTIVE";
}

function rowRoleList(row: Record<string, unknown>): string[] {
  const raw = row.roles ?? row.user_roles ?? row.userRoles;
  if (Array.isArray(raw)) {
    return raw.map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean);
  }
  const single = String(raw ?? "").trim().toUpperCase();
  return single ? [single] : [];
}

export function isAccountManagerOnboardRow(row: OnboardItem | Record<string, unknown>): boolean {
  const r = onboardRowRecord(row);
  if (rowRoleList(r).includes("ROLE_AM")) return true;
  const fields = [
    r.department,
    r.user_type,
    r.userType,
    r.designation,
    r.role,
    r.job_title,
    r.title,
    r.stream,
  ].map((v) => String(v ?? "").trim().toLowerCase());
  return fields.some(
    (f) => f === "account manager" || f.includes("account manager")
  );
}

/** Lowercase emails for users tagged as account managers on the onboard list. */
export function buildAccountManagerEmailSet(
  rows: Array<OnboardItem | Record<string, unknown>>
): Set<string> {
  const emails = new Set<string>();
  for (const row of rows) {
    if (!isAccountManagerOnboardRow(row)) continue;
    const email = emailFromOnboardRow(onboardRowRecord(row)).toLowerCase();
    if (email) emails.add(email);
  }
  return emails;
}

export function requestRowEmail(row: Record<string, unknown>): string {
  const direct = String(
    row.emp_email ??
      row.employee_email ??
      row.user_email ??
      row.userEmail ??
      row.email ??
      ""
  )
    .trim()
    .toLowerCase();
  if (direct) return direct;
  return emailFromOnboardRow(row);
}

/** Map GET /api/v1/user/onboard rows to picker options (deduped by user id). */
export function onboardRowsToEmployeeOptions(
  rows: Array<OnboardItem | Record<string, unknown>>
): OnboardEmployeeOption[] {
  return Array.from(
    new Map(
      rows
        .map((row) => {
          const r = onboardRowRecord(row);
          const rawId = String(
            r.user_id ??
              r.userId ??
              r.emp_id ??
              r.empId ??
              r.id ??
              (r.user as Record<string, unknown> | undefined)?.id ??
              ""
          ).trim();
          const email = emailFromOnboardRow(r);
          const nameRaw = String(r.name ?? "Employee").trim();
          const name =
            nameRaw.replace(/\s*\([^()@\s]+@[^()@\s]+\.[^()@\s]+\)\s*$/, "").trim() ||
            nameRaw ||
            "Employee";
          const userId = rawId || (email ? `email:${email.toLowerCase()}` : "");
          if (!userId) return null;
          const label = email ? `${name} (${email})` : name;
          return [userId, { id: userId, label, name, email }] as const;
        })
        .filter((item): item is readonly [string, OnboardEmployeeOption] => Boolean(item))
    ).values()
  );
}

export function accountManagerOptionsFromOnboard(
  rows: Array<OnboardItem | Record<string, unknown>>
): OnboardEmployeeOption[] {
  const managers = onboardRowsToEmployeeOptions(rows.filter(isAccountManagerOnboardRow));
  return managers.length ? managers : onboardRowsToEmployeeOptions(rows);
}
