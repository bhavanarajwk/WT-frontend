/** GET /api/v1/user/offboard — `data.items[]`. */
export interface OffboardListItem {
  emp_id: string;
  status: string;
  employee_name: string;
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
}

export interface OffboardListData {
  items: OffboardListItem[];
  total: number;
  page: number;
  size: number;
}

export interface OffboardListQuery {
  page?: number;
  size?: number;
  search?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
}
