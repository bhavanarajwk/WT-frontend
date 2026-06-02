/** POST / PUT /api/v1/user/onboard — response `data`. */
export interface OnboardUserResponse {
  emp_id: string;
  email: string;
  personal_email: string | null;
  name: string;
  status: string;
  user_type: string;
  work_location_type: string | null;
  date_of_birth: string | null;
  yoe: number | null;
  primary_skills: string[];
}

/** PUT user_data — secondary skill entry. */
export interface SecondarySkillRating {
  skill: string;
  rating: number;
}

/** GET /api/v1/user/onboard — `data.items[]`. */
export interface OnboardListItem {
  emp_id: string | null;
  email: string;
  personal_email: string | null;
  name: string;
  status: string;
  user_type: string;
  department: string | null;
  work_mode: string | null;
  role: string | null;
  phone_number: string | null;
  profile_photo: string | null;
  doj: string | null;
  doi: string | null;
  date_of_birth: string | null;
  band_id: number | null;
  band: string | null;
  yoe: number | null;
  primary_skills: string[];
  /** Present on GET /user/invited rows. */
  created_at?: string | null;
  createdAt?: string | null;
}

export interface OnboardListData {
  items: OnboardListItem[];
  total: number;
  page: number;
  size: number;
}
