import { parseApiDate } from "@/utils/apiDate";

export type ExitType = "VOLUNTARY" | "INVOLUNTARY" | "CONTRACTUAL";

export const CONSULTANT_EXIT_TYPE: ExitType = "CONTRACTUAL";

/** Default notice period for FTE/consultant offboarding (calendar days after resignation). */
export const DEFAULT_NOTICE_PERIOD_DAYS = 60;

export const EXIT_TYPE_SELECT_OPTIONS: Array<{ value: ExitType; label: string }> = [
  { value: "VOLUNTARY", label: "Voluntary" },
  { value: "INVOLUNTARY", label: "Involuntary" },
  { value: "CONTRACTUAL", label: "Contractual" },
];

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

/** Add calendar days to a date input (`yyyy-mm-dd`) or API date string. */
export function addDaysToDateInput(value: string, days: number): string {
  const parsed = parseApiDate(value);
  if (!parsed || days < 0) return "";
  const next = new Date(parsed);
  next.setDate(next.getDate() + days);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultLastWorkingDayFromResignation(resignationDate: string): string {
  const trimmed = resignationDate.trim();
  if (!trimmed) return "";
  return addDaysToDateInput(trimmed, DEFAULT_NOTICE_PERIOD_DAYS);
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
