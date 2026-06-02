export type OffboardingFormState = {
  emp_id: string;
  resignation_date: string;
  last_working_day: string;
  separation_type: "" | "VOLUNTARY" | "INVOLUNTARY";
  reason: string;
  critical_skill: string;
  is_regretted: boolean;
};

export function createEmptyOffboardingForm(): OffboardingFormState {
  return {
    emp_id: "",
    resignation_date: "",
    last_working_day: "",
    separation_type: "",
    reason: "",
    critical_skill: "",
    is_regretted: false,
  };
}
