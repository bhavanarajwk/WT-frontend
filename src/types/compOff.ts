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

export type CompOffExpiryStatus = "ACTIVE" | "EXPIRED" | "EXHAUSTED" | string;

export interface CompOffExpiryItem {
  grant_id?: number;
  grantId?: number;
  worked_date?: string;
  workedDate?: string;
  expiry_date?: string;
  expiryDate?: string;
  last_usable_date?: string;
  lastUsableDate?: string;
  units?: number;
  remaining_units?: number;
  remainingUnits?: number;
  used_units?: number;
  usedUnits?: number;
  days_until_expiry?: number;
  daysUntilExpiry?: number;
  status?: CompOffExpiryStatus;
  project_code?: string;
  projectCode?: string;
  work_description?: string;
  workDescription?: string;
}

export interface CompOffExpiryData {
  as_of_date?: string;
  asOfDate?: string;
  total?: number;
  data?: CompOffExpiryItem[];
}

export type CompOffRequestType = "COMP_OFF" | "COMP_OFF_EARN";
