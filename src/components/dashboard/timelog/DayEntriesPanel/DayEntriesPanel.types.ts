import type { DayTimelogEntry } from "@/hooks/timelog/useDayTimelog.types";

export type DayEntriesPanelProps = {
  selectedDate: string | null;
  entries: DayTimelogEntry[];
  totalHours: number;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  onAdd: () => void;
  onEdit: (entry: DayTimelogEntry) => void;
  onDelete: (entryId: number) => void;
  onSubmit: () => void;
  onClose: () => void;
};
