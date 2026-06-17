export interface OnboardOptionItem {
  value: string;
  label: string;
}

export interface OnboardOptionsResponse {
  categories: OnboardOptionItem[];
  work_modes: OnboardOptionItem[];
  work_location_types: OnboardOptionItem[];
  user_types: OnboardOptionItem[];
  departments: OnboardOptionItem[];
  genders: OnboardOptionItem[];
  marital_statuses: OnboardOptionItem[];
  blood_groups: OnboardOptionItem[];
  holiday_calendars: OnboardOptionItem[];
}
