import type { TimelogGridRow } from "@/utils/timelog/gridState";

export type EmployeeWeekDetailProps = {
  employeeEmail: string;
  weekStart: Date;
  dayKeys: string[];
  dayDates: Date[];
  gridRows: TimelogGridRow[];
  loading: boolean;
  actionLoading: boolean;
  onBack: () => void;
  onWeekChange: (ws: Date) => void;
  onRefresh: () => void;
  onApprove: (row: TimelogGridRow, remark: string) => void;
  onReject: (row: TimelogGridRow, remark: string) => void;
};
