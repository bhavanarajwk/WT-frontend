export interface Designation {
  id: number;
  name: string;
  band_id: number | null;
  department: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DesignationCreateRequest {
  band_id: number;
  department: string;
  name: string;
}

export interface BandListItem {
  id: number;
  name: string | null;
}

export interface DepartmentListItem {
  name: string;
}
