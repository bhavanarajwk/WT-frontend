export type DayTimelogEntry = {
  id: number;
  employee_email: string;
  project_code: string;
  log_date: string;
  hours: number;
  task_category: string;
  sub_category: string | null;
  description: string | null;
  status: string;
  manager_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DayTimelogEntryForm = {
  project_code: string;
  task_category: string;
  sub_category: string;
  description: string;
  hours: string;
};

export type DayEntriesMap = Record<string, DayTimelogEntry[]>;

export type CalendarDayInfo = {
  date: Date;
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  totalHours: number;
  entryCount: number;
};

export type CalendarMonth = {
  year: number;
  month: number;
  days: CalendarDayInfo[];
};
