/** GET /api/v1/user/offboard — `data.items[]` (exit survey follow-up list). */
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
  items: OffboardListItem[];
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
