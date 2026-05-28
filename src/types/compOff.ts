export type CompOffGrantStatus = "ACTIVE" | "EXPIRED" | "CONSUMED" | string;

export interface CompOffGrant {
  grant_id?: number;
  grantId?: number;
  worked_date?: string;
  workedDate?: string;
  expiry_date?: string;
  expiryDate?: string;
  remaining_units?: number;
  remainingUnits?: number;
  status?: CompOffGrantStatus;
  project_code?: string;
  projectCode?: string;
  project_name?: string;
  projectName?: string;
}

export interface CompOffBalanceData {
  available_units?: number;
  availableUnits?: number;
  as_of_date?: string;
  asOfDate?: string;
}

export type CompOffRequestType = "COMP_OFF" | "COMP_OFF_EARN";
