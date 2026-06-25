/** GET /api/v1/user/offboard — HR offboarding list (`data.items[]`). */
export interface HrOffboardListItem {
  emp_id: string;
  status: string;
  employee_name: string;
  email?: string;
  exit_type: string;
  reason: string | null;
  expected_behavior: string | null;
  critical_skill: string | null;
  is_regretted: boolean;
  resignation_date: string;
  last_working_day: string;
  notice_period_days: number;
  designation: string | null;
  band_name: string | null;
  band_role: string | null;
  project_manager: string | null;
  exit_survey_submitted?: boolean;
  can_resend_exit_survey?: boolean;
  submission_status?: "SUBMITTED" | "PENDING";
}

/** GET /api/v1/user/offboard — exit survey follow-up list (`data.items[]`). */
export interface OffboardListItem {
  emp_id: string | null;
  employee_name: string;
  email: string;
  last_working_day: string | null;
  resignation_date?: string | null;
  employee_status?: string | null;
  submission_status?: "SUBMITTED" | "PENDING";
  submitted_at?: string | null;
  lookup_id?: string;
  exit_survey_submitted: boolean;
  can_resend_exit_survey: boolean;
  can_view_submission?: boolean;
}

export interface OffboardListData {
  items: HrOffboardListItem[];
  total: number;
  page: number;
  size: number;
  follow_up_window_start?: string;
  follow_up_window_end?: string;
}

export interface OffboardListQuery {
  page?: number;
  size?: number;
  search?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
}
