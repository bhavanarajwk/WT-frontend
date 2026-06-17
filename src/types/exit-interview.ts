export type ExitInterviewProfileFlags = {
  exit_interview_applicable: boolean;
  can_fill_exit_interview: boolean;
  exit_interview_submitted: boolean;
  exit_interview_resignation_date: string | null;
  exit_interview_last_working_day: string | null;
  exit_interview_days_until_last_working_day: number | null;
  portal_locked: boolean;
};

export type FormFieldOption = { value: string; label: string };

export type FormFieldWidget =
  | "readonly_text"
  | "readonly_date"
  | "multi_select"
  | "single_select"
  | "scale_1_10"
  | "textarea";

export type FormField = {
  key: string;
  label: string;
  widget: FormFieldWidget;
  required: boolean;
  options?: FormFieldOption[];
  other_field?: string;
  exclusive_none_value?: string;
  min?: number;
  max?: number;
  min_label?: string;
  max_label?: string;
};

export type ExitInterviewFormDefinition = {
  fields: FormField[];
};

export type ExitInterviewSubmitBody = {
  reporting_managers: string;
  exit_reasons: string[];
  exit_reasons_other?: string | null;
  additional_exit_factors: string[];
  leadership_improvement_areas: string[];
  leadership_improvement_other?: string | null;
  leadership_support_rating: number;
  skills_utilized: string;
  workload_rating: number;
  policies_clarity: string;
  company_improvement_areas: string[];
  company_improvement_other?: string | null;
  learning_opportunities: string;
  compensation_fairness_rating: number;
  valued_most: string;
  recommend_webknot: string;
  final_feedback?: string | null;
};

export type ExitInterviewSubmitResult = {
  id: number;
  submitted_at: string;
};

export type ExitInterviewSubmissionStatus = "SUBMITTED" | "PENDING";

export type ExitInterviewResponseField = {
  field: string;
  label: string;
  value: unknown;
};

export type ExitInterviewListItem = {
  emp_id: string | null;
  employee_name: string;
  email: string;
  department: string | null;
  submitted_at: string | null;
  last_working_day: string | null;
  resignation_date: string | null;
  exit_type?: string | null;
  /** @deprecated API legacy field; prefer exit_type */
  separation_type?: string | null;
  submission_status: ExitInterviewSubmissionStatus;
  employee_status?: string | null;
  lookup_id?: string;
  can_view_submission?: boolean;
};

export type ExitInterviewSubmissionsListData = {
  items: ExitInterviewListItem[];
  total: number;
  page: number;
  size: number;
};

export type ExitInterviewSubmissionDetail = {
  emp_id: string | null;
  employee_name: string;
  email: string;
  department: string | null;
  submitted_at: string | null;
  last_working_day: string | null;
  resignation_date: string | null;
  exit_type?: string | null;
  /** @deprecated API legacy field; prefer exit_type */
  separation_type?: string | null;
  employee_status?: string | null;
  submission_status?: ExitInterviewSubmissionStatus;
  responses: Record<string, unknown>;
  response_fields?: ExitInterviewResponseField[];
  minutes_of_meeting?: string | null;
};

export type ExitInterviewMinutesOfMeetingUpdate = {
  minutes_of_meeting?: string | null;
};

export type ExitInterviewResendResult = {
  emp_id: string;
  email: string;
  employee_name: string;
  message: string;
};

export type ExitSurveyResendStatus = "SENT" | "SKIPPED" | "FAILED";

export type ExitSurveyBulkResendItemResult = {
  emp_id: string;
  email: string | null;
  employee_name: string | null;
  status: ExitSurveyResendStatus;
  message: string;
};

export type ExitSurveyBulkResendData = {
  sent_count: number;
  skipped_count: number;
  failed_count: number;
  results: ExitSurveyBulkResendItemResult[];
};

export type ExitInterviewSubmissionsQuery = {
  page?: number;
  size?: number;
  search?: string;
  status?: "SUBMITTED" | "PENDING" | "ALL";
};
