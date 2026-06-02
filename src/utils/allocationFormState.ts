export type ProjectFormState = {
  project_name: string;
  project_type: "" | "IN_HOUSE" | "STAFFING" | "PRODUCT";
  client_name: string;
  account_manager_email: string;
};

export type AllocationFormState = {
  allocation_id: string;
  employee_email: string;
  project_code: string;
  role: string;
  allocated_hours: string;
  start_date: string;
  end_date: string;
  allocation_type: string;
  billing_status: "" | "BILLED" | "BUFFER" | "INVESTMENT";
  is_manager: boolean;
};

export function createEmptyProjectForm(): ProjectFormState {
  return {
    project_name: "",
    project_type: "",
    client_name: "",
    account_manager_email: "",
  };
}

export function createEmptyAllocationForm(): AllocationFormState {
  return {
    allocation_id: "",
    employee_email: "",
    project_code: "",
    role: "",
    allocated_hours: "",
    start_date: "",
    end_date: "",
    allocation_type: "",
    billing_status: "",
    is_manager: false,
  };
}

export function createEmptyAllocationExtensionForm() {
  return {
    userEmail: "",
    projectCode: "",
    requestedEndDate: "",
    reason: "",
  };
}
