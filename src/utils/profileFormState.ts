export type SelfProfileFormState = {
  phone_country?: string;
  phone_number: string;
  primary_skills: string;
  secondary_skill: string;
  secondary_rating: string;
  yoe: string;
};

export function createEmptySelfProfileForm(): SelfProfileFormState {
  return {
    phone_country: "IN",
    phone_number: "",
    primary_skills: "",
    secondary_skill: "",
    secondary_rating: "",
    yoe: "",
  };
}
