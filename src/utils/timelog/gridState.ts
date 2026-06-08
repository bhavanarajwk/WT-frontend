export type TimelogGridRow = {
  clientKey: string;
  project_code: string;
  task_category: string;
  sub_category: string;
  comment: string;
  hours_by_date: Record<string, string>;
  entry_ids_by_date?: Record<string, number>;
  status_by_date?: Record<string, string>;
};

export type TimelogWeekSnapshot = {
  week_start: string;
  week_end: string;
  days: string[];
  employee_email: string;
  rows: Array<{
    project_code: string;
    project_name?: string;
    task_category: string;
    sub_category?: string | null;
    comment?: string | null;
    hours_by_date: Record<string, number>;
    entry_ids_by_date?: Record<string, number>;
    status_by_date?: Record<string, string>;
  }>;
  daily_totals: Record<string, number>;
  weekly_total: number;
};

export function createEmptyGridRow(dayKeys: string[]): TimelogGridRow {
  const hours_by_date: Record<string, string> = {};
  for (const key of dayKeys) hours_by_date[key] = "";
  return {
    clientKey: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    project_code: "",
    task_category: "",
    sub_category: "",
    comment: "",
    hours_by_date,
  };
}

export function gridRowsFromWeekSnapshot(snapshot: TimelogWeekSnapshot | null, dayKeys: string[]): TimelogGridRow[] {
  if (!snapshot?.rows?.length) return [createEmptyGridRow(dayKeys)];
  return snapshot.rows.map((row, index) => {
    const hours_by_date: Record<string, string> = {};
    for (const key of dayKeys) {
      const val = row.hours_by_date?.[key];
      hours_by_date[key] = val != null && val > 0 ? String(val) : "";
    }
    return {
      clientKey: `saved-${index}-${row.project_code}-${row.task_category}`,
      project_code: row.project_code,
      task_category: row.task_category,
      sub_category: row.sub_category ?? "",
      comment: row.comment ?? "",
      hours_by_date,
      entry_ids_by_date: row.entry_ids_by_date,
      status_by_date: row.status_by_date,
    };
  });
}

export function weekPayloadFromGridRows(
  rows: TimelogGridRow[],
  dayKeys: string[]
): Array<{
  project_code: string;
  task_category: string;
  sub_category?: string;
  comment?: string;
  hours_by_date: Record<string, number>;
}> {
  return rows
    .filter((row) => row.project_code.trim() && row.task_category.trim())
    .map((row) => {
      const hours_by_date: Record<string, number> = {};
      for (const key of dayKeys) {
        const n = Number(row.hours_by_date[key]);
        if (Number.isFinite(n) && n > 0) hours_by_date[key] = n;
      }
      return {
        project_code: row.project_code.trim(),
        task_category: row.task_category.trim(),
        sub_category: row.sub_category.trim() || undefined,
        comment: row.comment.trim() || undefined,
        hours_by_date,
      };
    });
}
