export type SelfOnboardFormState = {
  personal_email: string;
  full_name: string;
  phone_number: string;
  yoe: string;
  primary_skills: string;
  secondary_skill: string;
  secondary_rating: string;
  work_location_type: string;
  resume_share_link: string;
};

export function createEmptySelfOnboardForm(): SelfOnboardFormState {
  return {
    personal_email: "",
    full_name: "",
    phone_number: "",
    yoe: "",
    primary_skills: "",
    secondary_skill: "",
    secondary_rating: "",
    work_location_type: "",
    resume_share_link: "",
  };
}
