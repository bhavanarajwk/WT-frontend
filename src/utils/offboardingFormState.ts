export type ExitType = "VOLUNTARY" | "INVOLUNTARY";

export type OffboardingFormState = {
  emp_id: string;
  resignation_date: string;
  last_working_day: string;
  exit_type: "" | ExitType;
  reason: string;
  critical_skill: string;
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
