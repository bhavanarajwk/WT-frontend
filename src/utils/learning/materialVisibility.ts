export type MaterialVisibility = "EMPLOYEE" | "HR_ONLY";

export const MATERIAL_VISIBILITY_OPTIONS: Array<{ value: MaterialVisibility; label: string }> = [
  { value: "EMPLOYEE", label: "Employees" },
  { value: "HR_ONLY", label: "HR only" },
];

export function formatMaterialVisibility(value: unknown): string {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "EMPLOYEE") return "Employees";
  if (v === "HR_ONLY") return "HR only";
  if (!v) return "—";
  return v
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isMaterialVisibility(value: string): value is MaterialVisibility {
  return value === "EMPLOYEE" || value === "HR_ONLY";
}
