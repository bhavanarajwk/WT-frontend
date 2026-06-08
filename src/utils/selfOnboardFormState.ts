export type SelfOnboardFormState = {
  personal_email: string;
  full_name: string;
  yoe: string;
  experience: string;
  primary_skills: string;
  secondary_skill: string;
  secondary_rating: string;
  work_location_type: string;
  resume_share_link: string;
  local_address: string;
  permanent_address: string;
  gender: string;
  marital_status: string;
  blood_group: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
};

export function createEmptySelfOnboardForm(): SelfOnboardFormState {
  return {
    personal_email: "",
    full_name: "",
    yoe: "",
    experience: "",
    primary_skills: "",
    secondary_skill: "",
    secondary_rating: "",
    work_location_type: "",
    resume_share_link: "",
    local_address: "",
    permanent_address: "",
    gender: "",
    marital_status: "",
    blood_group: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
  };
}
