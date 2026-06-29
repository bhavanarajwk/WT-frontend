import type { CalendarMonth } from "@/hooks/timelog/useDayTimelog.types";

export type TimelogCalendarProps = {
  calendar: CalendarMonth;
  selectedDate: string | null;
  loading: boolean;
  viewYear: number;
  viewMonth: number;
  doj?: string;
  onSelectDate: (dateKey: string) => void;
  onNavigate: (delta: number) => void;
  onGoToToday: () => void;
  onGoToMonth: (year: number, month: number) => void;
};
