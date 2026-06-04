import type { SelectFieldOption } from "@/components/dashboard/ui/forms";
import type { ProjectTypeRow } from "@/types/projectType";
import { toRows } from "@/utils/apiRows";

export function normalizeProjectTypeRows(data: unknown): ProjectTypeRow[] {
  const rows = toRows(data);
  return rows
    .map((row) => {
      const code = String(row.code ?? row.projectType ?? row.project_type ?? "")
        .trim()
        .toUpperCase();
      const label = String(row.label ?? row.name ?? code).trim();
      if (!code) return null;
      const sortRaw = row.sortOrder ?? row.sort_order;
      const sortOrder =
        sortRaw === undefined || sortRaw === null || sortRaw === ""
          ? 0
          : Number(sortRaw);
      const activeRaw = row.active;
      const active = activeRaw !== false && activeRaw !== "false" && activeRaw !== 0;
      return {
        code,
        label: label || code,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        active,
      };
    })
    .filter((row): row is ProjectTypeRow => row != null)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.label.localeCompare(b.label) ||
        a.code.localeCompare(b.code)
    );
}

export function projectTypeSelectOptions(types: ProjectTypeRow[]): SelectFieldOption[] {
  return types.map((t) => ({ value: t.code, label: t.label }));
}

export function projectTypeFilterOptions(types: ProjectTypeRow[]): SelectFieldOption[] {
  return [{ value: "ALL", label: "All types" }, ...projectTypeSelectOptions(types)];
}

export function projectTypeLabelByCode(types: ProjectTypeRow[]): Record<string, string> {
  return Object.fromEntries(types.map((t) => [t.code, t.label]));
}

/** Read project type code from a project row (camelCase or snake_case). */
export function projectTypeCodeFromRow(row: Record<string, unknown>): string {
  return String(row.projectType ?? row.project_type ?? "")
    .trim()
    .toUpperCase();
}

export function formatProjectTypeCode(
  code: unknown,
  labelByCode: Record<string, string>
): string {
  const key = String(code ?? "").trim().toUpperCase();
  if (!key || key === "—") return "—";
  return labelByCode[key] ?? key;
}

export function isKnownProjectTypeCode(
  code: string,
  types: ProjectTypeRow[]
): boolean {
  const normalized = code.trim().toUpperCase();
  return types.some((t) => t.code === normalized);
}

export function isStaffingProjectTypeCode(projectType: unknown): boolean {
  return String(projectType ?? "").trim().toUpperCase() === "STAFFING";
}

/** Resolve project type code for an allocation project picker / form selection. */
export function resolveProjectTypeForProjectCode(
  projectCode: string,
  sources: {
    projects: Array<Record<string, unknown>>;
    allocationProjects: Array<{ code: string; project_type?: string }>;
  }
): string {
  const code = projectCode.trim();
  if (!code) return "";
  const fromProjects = sources.projects.find(
    (p) =>
      String(p.project_code ?? p.projectCode ?? "")
        .trim()
        .toLowerCase() === code.toLowerCase()
  );
  const fromAlloc = sources.allocationProjects.find(
    (p) => p.code.trim().toLowerCase() === code.toLowerCase()
  );
  return (
    (fromProjects
      ? projectTypeCodeFromRow(fromProjects as Record<string, unknown>)
      : "") || String(fromAlloc?.project_type ?? "").trim().toUpperCase()
  );
}
