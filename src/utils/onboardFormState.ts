export type OnboardFormState = {
  emp_id: string;
  email: string;
  name: string;
  user_type: string;
  department: string;
  work_mode: string;
  work_location_type: string;
  role: string;
  band_id: number;
  category: string;
  doj: string;
  doi: string;
  internship_duration: string;
  reporting_manager_id: string;
  local_address: string;
  permanent_address: string;
  gender: string;
  marital_status: string;
  personal_email: string;
  phone_number: string;
  date_of_birth: string;
  holiday_calendar_id: string;
};

export function createEmptyOnboardForm(): OnboardFormState {
  return {
    emp_id: "",
    email: "",
    name: "",
    user_type: "",
    department: "",
    work_mode: "",
    work_location_type: "",
    role: "",
    band_id: 0,
    category: "",
    doj: "",
    doi: "",
    internship_duration: "",
    reporting_manager_id: "",
    local_address: "",
    permanent_address: "",
    gender: "",
    marital_status: "",
    personal_email: "",
    phone_number: "",
    date_of_birth: "",
    holiday_calendar_id: "",
  };
}
