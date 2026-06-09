import { TASK_CATEGORY_LABELS } from "@/utils/timelog/categories";
import type { TimelogWeekSnapshot } from "@/utils/timelog/gridState";
import { formatDayHeader, parseTimelogDate, toIsoDateKey } from "@/utils/timelog/weekDates";

export type TeamTimelogEntryLine = {
  project: string;
  task_category: string;
  sub_category: string;
  hours: number;
  comment: string;
};

export type TeamTimelogDayRow = {
  log_date: string;
  log_date_label: string;
  total_hours: number;
  entries: TeamTimelogEntryLine[];
};

/** @deprecated Use TeamTimelogDayRow — kept for any legacy flat-row usage */
export type TeamTimelogTableRow = TeamTimelogEntryLine & {
  log_date: string;
  log_date_label: string;
};

function flattenEntriesFromSnapshot(
  snapshot: TimelogWeekSnapshot | null,
  dayKeys: string[],
  dayDates: Date[]
): Array<TeamTimelogEntryLine & { log_date: string; log_date_label: string }> {
  if (!snapshot?.rows?.length) return [];

  const dateLabels = Object.fromEntries(dayKeys.map((key, i) => [key, formatDayHeader(dayDates[i])]));
  const entries: Array<TeamTimelogEntryLine & { log_date: string; log_date_label: string }> = [];

  for (const row of snapshot.rows) {
    const project = String(row.project_name ?? row.project_code ?? "").trim() || "—";
    const taskLabel =
      TASK_CATEGORY_LABELS[row.task_category] ?? row.task_category?.trim() ?? "—";
    const subCategory = String(row.sub_category ?? "").trim() || "—";
    const comment = String(row.comment ?? "").trim();

    for (const [rawDateKey, hours] of Object.entries(row.hours_by_date ?? {})) {
      if (hours == null || hours <= 0) continue;
      const logDate = toIsoDateKey(rawDateKey);
      const parsed = parseTimelogDate(logDate);
      entries.push({
        project,
        task_category: taskLabel,
        sub_category: subCategory,
        log_date: logDate,
        log_date_label: dateLabels[logDate] ?? (parsed ? formatDayHeader(parsed) : logDate),
        hours,
        comment: comment || "—",
      });
    }
  }

  return entries;
}

export function teamTimelogDaysFromWeekSnapshot(
  snapshot: TimelogWeekSnapshot | null,
  dayKeys: string[],
  dayDates: Date[]
): TeamTimelogDayRow[] {
  const flat = flattenEntriesFromSnapshot(snapshot, dayKeys, dayDates);
  const grouped = new Map<string, TeamTimelogDayRow>();

  for (const entry of flat) {
    const existing = grouped.get(entry.log_date);
    const line: TeamTimelogEntryLine = {
      project: entry.project,
      task_category: entry.task_category,
      sub_category: entry.sub_category,
      hours: entry.hours,
      comment: entry.comment,
    };

    if (existing) {
      existing.entries.push(line);
      existing.total_hours += entry.hours;
    } else {
      grouped.set(entry.log_date, {
        log_date: entry.log_date,
        log_date_label: entry.log_date_label,
        total_hours: entry.hours,
        entries: [line],
      });
    }
  }

  for (const day of grouped.values()) {
    day.entries.sort(
      (a, b) =>
        a.project.localeCompare(b.project) ||
        a.task_category.localeCompare(b.task_category) ||
        a.sub_category.localeCompare(b.sub_category)
    );
  }

  return Array.from(grouped.values());
}

/** Flat rows — one per entry (legacy) */
export function teamTimelogRowsFromWeekSnapshot(
  snapshot: TimelogWeekSnapshot | null,
  dayKeys: string[],
  dayDates: Date[]
): TeamTimelogTableRow[] {
  return flattenEntriesFromSnapshot(snapshot, dayKeys, dayDates);
}
