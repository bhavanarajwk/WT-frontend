export interface OnboardOptionItem {
  value: string;
  label: string;
}

export interface OnboardOptionsResponse {
  delivery_statuses: OnboardOptionItem[];
  work_modes: OnboardOptionItem[];
  work_location_types: OnboardOptionItem[];
  user_types: OnboardOptionItem[];
  departments: OnboardOptionItem[];
  defaults: {
    delivery_status: string;
    work_mode: string;
    work_location_type: string;
    user_type: string;
  };
}
