export type ProjectFormState = {
  project_name: string;
  /** Project type code from GET /project/types */
  project_type: string;
  client_name: string;
  account_manager_email: string;
  start_date: string;
  end_date: string;
};

export type AllocationFormState = {
  allocation_id: string;
  employee_email: string;
  project_code: string;
  role: string;
  /** Allocation percent code from GET /allocation/percentages (e.g. "50", "100") */
  allocated_percent: string;
  start_date: string;
  end_date: string;
  allocation_type: string;
  billing_status: "" | "BILLED" | "BUFFER" | "INVESTMENT";
};

export function createEmptyProjectForm(): ProjectFormState {
  return {
    project_name: "",
    project_type: "",
    client_name: "",
    account_manager_email: "",
    start_date: "",
    end_date: "",
  };
}

export function createEmptyAllocationForm(): AllocationFormState {
  return {
    allocation_id: "",
    employee_email: "",
    project_code: "",
    role: "",
    allocated_percent: "",
    start_date: "",
    end_date: "",
    allocation_type: "",
    billing_status: "",
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
