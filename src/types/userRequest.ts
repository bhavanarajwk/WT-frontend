export type ApprovalStage = "PENDING" | "APPROVED" | "REJECTED";

export interface UserRequestOut {
  id: number;
  emp_email: string;
  request_from_date: string;
  request_to_date: string;
  comments: string | null;
  request_type: "LEAVE" | "WFH" | "COMP_OFF" | string;
  status: ApprovalStage;
  manager_status: ApprovalStage | null;
  manager_reason: string | null;
  hr_status: ApprovalStage | null;
  hr_reason: string | null;
  is_half_day: boolean;
  reference_file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRequestStatusUpdate {
  userRequestId: number;
  userRequestStatus: ApprovalStage;
  reason?: string;
}

export interface UserRequestListData {
  current_page: number;
  total_pages: number;
  page_size: number;
  total_elements: number;
  data: UserRequestOut[];
}
