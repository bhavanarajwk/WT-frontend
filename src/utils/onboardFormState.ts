export type OnboardFormState = {
  emp_id: string;
  email: string;
  personal_email: string;
  name: string;
  user_type: string;
  department: string;
  phone_number: string;
  work_mode: string;
  work_location_type: string;
  role: string;
  band_id: number;
  delivery_status: string;
  dob: string;
  doj: string;
  doi: string;
  internship_duration: string;
};

export function createEmptyOnboardForm(): OnboardFormState {
  return {
    emp_id: "",
    email: "",
    personal_email: "",
    name: "",
    user_type: "",
    department: "",
    phone_number: "",
    work_mode: "",
    work_location_type: "",
    role: "",
    band_id: 0,
    delivery_status: "",
    dob: "",
    doj: "",
    doi: "",
    internship_duration: "",
  };
}
