export type ExitType = "VOLUNTARY" | "INVOLUNTARY" | "CONTRACTUAL";

export type OffboardingFormState = {
  emp_id: string;
  resignation_date: string;
  last_working_day: string;
  exit_type: "" | ExitType;
  reason: string;
  critical_skill: string;
  expected_behavior: string;
  is_regretted: boolean;
};

export function createEmptyOffboardingForm(): OffboardingFormState {
  return {
    emp_id: "",
    resignation_date: "",
    last_working_day: "",
    exit_type: "",
    reason: "",
    critical_skill: "",
    expected_behavior: "",
    is_regretted: false,
  };
}

/** Read exit type from API rows (offboard / exit-interview; legacy separation_type supported). */
export function readExitType(row: Record<string, unknown> | null | undefined): string {
  if (!row) return "";
  const value =
    row.exit_type ??
    row.exitType ??
    row.separation_type ??
    row.separationType ??
    "";
  return String(value).trim();
}

export const EXIT_TYPE_OPTIONS: Array<{ value: ExitType; label: string }> = [
  { value: "VOLUNTARY", label: "Voluntary" },
  { value: "INVOLUNTARY", label: "Involuntary" },
  { value: "CONTRACTUAL", label: "Contractual" },
];

export function formatExitTypeLabel(value: string): string {
  const v = String(value ?? "").trim().toUpperCase();
  const match = EXIT_TYPE_OPTIONS.find((opt) => opt.value === v);
  return match?.label ?? (v || "—");
}

export function formatUserTypeLabel(value: string): string {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "FULLTIME") return "Full-Time";
  if (v === "INTERN") return "Intern";
  if (v === "CONSULTANT") return "Consultant";
  return v || "—";
}

export function isOffboardingFormValid(
  form: OffboardingFormState,
  userType: string
): boolean {
  const normalizedType = userType.trim().toUpperCase();
  if (!form.emp_id.trim()) return false;
  if (!form.last_working_day.trim()) return false;
  if (!form.resignation_date.trim()) return false;
  if (normalizedType === "CONSULTANT") return true;
  return Boolean(form.exit_type);
}
