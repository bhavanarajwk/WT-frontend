export interface ProjectEmployee {
  email: string;
  name: string;
  emp_id: string | null;
}

export interface ProjectTimelogProject {
  project_code: string;
  project_name: string;
  project_type: string;
  employees: ProjectEmployee[];
}

export interface ProjectTimelogsData {
  projects: ProjectTimelogProject[];
}

export interface ProjectWeekEmployeeTotal {
  email: string;
  name: string;
  week_total: number;
}

export interface ProjectWeekTotalsData {
  project_code: string;
  week_start: string;
  employees: ProjectWeekEmployeeTotal[];
}

export interface ProjectTimelogsState {
  projects: ProjectTimelogProject[];
  projectsLoading: boolean;
  projectsError: string | null;
  weekTotals: Record<string, ProjectWeekEmployeeTotal[]>;
  weekTotalsLoading: boolean;
  selectedProject: string | null;
  selectedEmployee: string | null;
  expandedProject: string | null;
  weekStart: string;
  setWeekStart: (ws: string) => void;
  toggleProject: (code: string) => void;
  selectEmployee: (email: string | null) => void;
  reload: () => void;
}
