import { allocationProjectCode, allocationProjectTitleFromRow } from "@/utils/dashboard/allocationDisplay";
import {
  accountManagerEmailFromRow,
  accountManagerUserIdFromRow,
  emailFromUserId,
  projectManagerEmailFromAllocationRows,
} from "@/utils/compOffUserMap";

export type CompOffProjectOption = {
  code: string;
  name: string;
  label: string;
  managerEmail: string;
};

function isLikelyNumericId(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function projectManagerEmailFromRow(
  row: Record<string, unknown>,
  userIdToEmail?: Map<string, string>
): string {
  const direct = String(
    row.manager_comp_off_email ??
      row.managerCompOffEmail ??
      row.manager_email ??
      row.managerEmail ??
      row.project_manager_email ??
      row.projectManagerEmail ??
      row.pm_email ??
      row.pmEmail ??
      ""
  )
    .trim()
    .toLowerCase();
  if (direct.includes("@")) return direct;

  const amEmail = accountManagerEmailFromRow(row);
  if (amEmail) return amEmail;

  if (userIdToEmail) {
    const amId = accountManagerUserIdFromRow(row);
    const resolved = emailFromUserId(amId, userIdToEmail);
    if (resolved) return resolved;
  }

  const nestedProject = row.project as Record<string, unknown> | undefined;
  const nestedManager = row.manager as Record<string, unknown> | undefined;
  if (nestedProject) {
    const nestedEmail = projectManagerEmailFromRow(nestedProject, userIdToEmail);
    if (nestedEmail) return nestedEmail;
  }
  const nestedMgrEmail = String(
    nestedManager?.email ?? nestedManager?.user_email ?? nestedManager?.userEmail ?? ""
  )
    .trim()
    .toLowerCase();
  return nestedMgrEmail.includes("@") ? nestedMgrEmail : "";
}

export function projectCodeFromRow(row: Record<string, unknown>): string {
  return allocationProjectCode(row);
}

export function projectNameFromRow(row: Record<string, unknown>): string {
  const title = allocationProjectTitleFromRow(row);
  if (title) return title;
  const nested = row.project as Record<string, unknown> | undefined;
  return String(nested?.project_name ?? nested?.projectName ?? nested?.name ?? "").trim();
}

function displayLabel(code: string, name: string): string {
  const trimmedName = name.trim();
  if (trimmedName && trimmedName !== "—" && trimmedName !== code) {
    return trimmedName;
  }
  if (isLikelyNumericId(code)) {
    return trimmedName ? trimmedName : `Project ${code}`;
  }
  return trimmedName || code;
}

/** Merge assigned projects + user allocations into comp-off project picker options. */
export function buildCompOffProjectOptions(
  assignedRows: Array<Record<string, unknown>>,
  allocationRows: Array<Record<string, unknown>>,
  userIdToEmail: Map<string, string> = new Map()
): CompOffProjectOption[] {
  const map = new Map<string, CompOffProjectOption>();
  const allRows = [...assignedRows, ...allocationRows];

  const ingest = (row: Record<string, unknown>) => {
    const code = projectCodeFromRow(row);
    if (!code) return;
    const key = code.toLowerCase();
    const name = projectNameFromRow(row);
    let mgr =
      projectManagerEmailFromRow(row, userIdToEmail) ||
      projectManagerEmailFromAllocationRows(code, allRows);
    const existing = map.get(key);
    const resolvedName = displayLabel(code, name || existing?.name || "");
    map.set(key, {
      code,
      name: resolvedName,
      label: resolvedName,
      managerEmail: mgr || existing?.managerEmail || "",
    });
  };

  for (const row of allRows) {
    ingest(row);
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function managerEmailFromProjectDetail(data: Record<string, unknown> | null): string {
  if (!data) return "";
  return projectManagerEmailFromRow(data);
}
