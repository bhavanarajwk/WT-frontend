export type TimelogFormState = {
  project_code: string;
  log_date: string;
  hours: string;
  description: string;
  subject_employee_email: string;
};

export function createEmptyTimelogForm(): TimelogFormState {
  return {
    project_code: "",
    log_date: "",
    hours: "",
    description: "",
    subject_employee_email: "",
  };
}
