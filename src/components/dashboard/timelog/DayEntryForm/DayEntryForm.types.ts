import type { DayTimelogEntry, DayTimelogEntryForm } from "@/hooks/timelog/useDayTimelog.types";
import type { TimelogProjectOption } from "@/utils/timelog/categories";

export type DayEntryFormProps = {
  entry: DayTimelogEntry | null;
  projectOptions: TimelogProjectOption[];
  actionLoading: boolean;
  dayTotalHours: number;
  selectedDate: string;
  onSave: (form: DayTimelogEntryForm) => void;
  onSaveAndSubmit: (form: DayTimelogEntryForm) => void;
  onUpdate: (entryId: number, form: DayTimelogEntryForm) => void;
  onCancel: () => void;
};
