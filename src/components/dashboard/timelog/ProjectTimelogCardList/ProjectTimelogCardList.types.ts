import type { ProjectTimelogProject, ProjectWeekEmployeeTotal } from "@/hooks/timelog/useProjectTimelogs.types";

export type ProjectTimelogCardListProps = {
  projects: ProjectTimelogProject[];
  weekTotals: Record<string, ProjectWeekEmployeeTotal[]>;
  weekTotalsLoading: boolean;
  expandedProject: string | null;
  selectedEmployee: string | null;
  onToggleProject: (code: string) => void;
  onSelectEmployee: (email: string | null) => void;
};
