"use client";

import {
  subCategoriesFor,
  subCategoryRequired,
  TASK_CATEGORY_LABELS,
  type TimelogOptionsPayload,
  type TimelogProjectOption,
} from "@/utils/timelog/categories";
import {
  dailyHourHighlight,
  dailyHourHighlightClass,
  dailyTotals,
  rowTotal,
  weeklyTotal,
} from "@/utils/timelog/gridTotals";
import type { TimelogGridRow } from "@/utils/timelog/gridState";
import {
  dayHasSubmittedEntries,
  isRowMetadataEditable,
  isTimelogCellEditable,
} from "@/utils/timelog/gridState";
import { formatDayHeader, formatHoursDisplay } from "@/utils/timelog/weekDates";

type WeeklyTimelogGridProps = {
  rows: TimelogGridRow[];
  dayDates: Date[];
  dayKeys: string[];
  projectOptions: TimelogProjectOption[];
  readOnly?: boolean;
  canApprove?: boolean;
  onApproveDay?: (dayKey: string) => void;
  onRejectDay?: (dayKey: string) => void;
  onRowsChange: (rows: TimelogGridRow[]) => void;
};

function updateRow(rows: TimelogGridRow[], clientKey: string, patch: Partial<TimelogGridRow>): TimelogGridRow[] {
  return rows.map((row) => (row.clientKey === clientKey ? { ...row, ...patch } : row));
}

function readOnlyText(value: string | undefined | null, fallback = "—"): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

function projectLabel(row: TimelogGridRow, projectOptions: TimelogProjectOption[]): string {
  if (row.project_name?.trim()) return row.project_name.trim();
  const selected = projectOptions.find(
    (p) => p.project_code.toUpperCase() === row.project_code.trim().toUpperCase()
  );
  return readOnlyText(selected?.project_name ?? row.project_code);
}

function taskCategoryLabel(row: TimelogGridRow): string {
  return readOnlyText(TASK_CATEGORY_LABELS[row.task_category] ?? row.task_category);
}

function subCategoryLabel(row: TimelogGridRow): string {
  const subOptions =
    row.project_code && row.task_category
      ? subCategoriesFor(row.project_code, row.task_category)
      : [];
  if (!subOptions.length) return "—";
  return readOnlyText(row.sub_category);
}

export function WeeklyTimelogGrid({
  rows,
  dayDates,
  dayKeys,
  projectOptions,
  readOnly = false,
  canApprove = false,
  onApproveDay,
  onRejectDay,
  onRowsChange,
}: WeeklyTimelogGridProps) {
  const totals = dailyTotals(rows, dayKeys);
  const weekSum = weeklyTotal(totals);

  const addRow = () => {
    const hours_by_date: Record<string, string> = {};
    for (const key of dayKeys) hours_by_date[key] = "";
    onRowsChange([
      ...rows,
      {
        clientKey: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        project_code: "",
        task_category: "",
        sub_category: "",
        comment: "",
        hours_by_date,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="wt-scroll-both overflow-x-auto rounded-xl border border-wt-border">
        <table className="min-w-[1040px] w-full text-sm border-collapse">
          <thead className="bg-wt-surface-2 text-wt-text-muted">
            <tr>
              <th className="text-left px-2 py-2 font-medium min-w-[120px]">Project</th>
              <th className="text-left px-2 py-2 font-medium min-w-[108px]">Task Category</th>
              <th className="text-left px-2 py-2 font-medium min-w-[120px]">Sub category</th>
              <th className="text-left px-2 py-2 font-medium min-w-[200px]">Description</th>
              {dayDates.map((d, i) => (
                <th key={dayKeys[i]} className="text-center px-1 py-2 font-medium min-w-[2.75rem] w-11 whitespace-nowrap text-xs">
                  {formatDayHeader(d)}
                </th>
              ))}
              <th className="text-center px-2 py-2 font-medium min-w-[3rem]">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selectedProject = projectOptions.find(
                (p) => p.project_code.toUpperCase() === row.project_code.trim().toUpperCase()
              );
              const taskOptions =
                selectedProject?.task_categories ??
                (row.project_code
                  ? [{ value: row.task_category, label: TASK_CATEGORY_LABELS[row.task_category] ?? row.task_category }]
                  : []);
              const subOptions = row.project_code && row.task_category
                ? subCategoriesFor(row.project_code, row.task_category)
                : [];
              const total = rowTotal(row.hours_by_date, dayKeys);
              const metadataEditable = isRowMetadataEditable(row, dayKeys);

              return (
                <tr key={row.clientKey} className="border-t border-wt-border align-top">
                  {readOnly ? (
                    <>
                      <td className="px-2 py-2 font-medium">{projectLabel(row, projectOptions)}</td>
                      <td className="px-2 py-2">{taskCategoryLabel(row)}</td>
                      <td className="px-2 py-2 text-wt-text-muted">{subCategoryLabel(row)}</td>
                      <td className="px-2 py-2 min-w-[200px] text-wt-text-muted">
                        {readOnlyText(row.comment)}
                      </td>
                      {dayKeys.map((key) => (
                        <td key={key} className="px-1 py-2 text-center align-top tabular-nums">
                          {formatHoursDisplay(Number(row.hours_by_date[key] ?? 0))}
                        </td>
                      ))}
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-2">
                        <select
                          className="input-field w-full px-2 py-1.5 text-sm"
                          disabled={!metadataEditable}
                          value={row.project_code}
                          onChange={(e) => {
                            const project_code = e.target.value;
                            const opt = projectOptions.find((p) => p.project_code === project_code);
                            const firstTask = opt?.task_categories[0]?.value ?? "";
                            onRowsChange(
                              updateRow(rows, row.clientKey, {
                                project_code,
                                task_category: firstTask,
                                sub_category: "",
                              })
                            );
                          }}
                        >
                          <option value="">Select project</option>
                          {projectOptions.map((p) => (
                            <option key={p.project_code} value={p.project_code}>
                              {p.project_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          className="input-field w-full px-2 py-1.5 text-sm"
                          disabled={!metadataEditable || !row.project_code}
                          value={row.task_category}
                          onChange={(e) =>
                            onRowsChange(
                              updateRow(rows, row.clientKey, {
                                task_category: e.target.value,
                                sub_category: "",
                              })
                            )
                          }
                        >
                          <option value="">Select task</option>
                          {taskOptions.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        {subOptions.length ? (
                          <select
                            className="input-field w-full px-2 py-1.5 text-sm"
                            disabled={!metadataEditable || !row.task_category}
                            value={row.sub_category}
                            onChange={(e) =>
                              onRowsChange(updateRow(rows, row.clientKey, { sub_category: e.target.value }))
                            }
                          >
                            <option value="">
                              {subCategoryRequired(row.project_code, row.task_category)
                                ? "Select sub category"
                                : "—"}
                            </option>
                            {subOptions.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-wt-text-muted text-xs py-2 block">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 min-w-[200px]">
                        <input
                          className="input-field w-full min-w-[180px] px-2 py-1.5 text-sm"
                          disabled={!metadataEditable}
                          value={row.comment}
                          onChange={(e) =>
                            onRowsChange(updateRow(rows, row.clientKey, { comment: e.target.value }))
                          }
                          placeholder="Optional"
                          aria-label="Description"
                        />
                      </td>
                      {dayKeys.map((key) => {
                        const cellStatus = row.status_by_date?.[key];
                        const cellEditable = isTimelogCellEditable(cellStatus);
                        return (
                          <td key={key} className="px-1 py-2 text-center align-top">
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={!cellEditable}
                              className="input-field w-11 max-w-[2.75rem] mx-auto px-0.5 py-1.5 text-xs text-center tabular-nums disabled:opacity-60"
                              value={row.hours_by_date[key] ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw !== "" && !/^\d*\.?\d{0,2}$/.test(raw)) return;
                                const hours_by_date = { ...row.hours_by_date, [key]: raw };
                                onRowsChange(updateRow(rows, row.clientKey, { hours_by_date }));
                              }}
                            />
                          </td>
                        );
                      })}
                    </>
                  )}
                  <td className="px-2 py-2 text-center font-medium whitespace-nowrap tabular-nums">
                    {formatHoursDisplay(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-wt-border bg-wt-surface-2 font-medium">
              <td colSpan={4} className="px-2 py-2 text-right text-wt-text-muted">
                Daily totals
              </td>
              {dayKeys.map((key) => {
                const total = totals[key] ?? 0;
                return (
                  <td
                    key={key}
                    className={`px-2 py-2 text-center tabular-nums ${dailyHourHighlightClass(
                      dailyHourHighlight(total)
                    )}`}
                  >
                    {formatHoursDisplay(total)}
                  </td>
                );
              })}
              <td className="px-2 py-2 text-center tabular-nums">{formatHoursDisplay(weekSum)}</td>
            </tr>
            {canApprove ? (
              <tr className="border-t border-wt-border bg-wt-surface-1">
                <td colSpan={4} className="px-2 py-2 text-right text-xs text-wt-text-muted">
                  Day actions
                </td>
                {dayKeys.map((key) => {
                  const showActions = dayHasSubmittedEntries(rows, key);
                  return (
                    <td key={key} className="px-1 py-2 text-center align-top">
                      {showActions ? (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            className="rounded border border-emerald-300 px-1 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50"
                            onClick={() => onApproveDay?.(key)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="rounded border border-rose-300 px-1 py-0.5 text-[10px] font-medium text-rose-700 hover:bg-rose-50"
                            onClick={() => onRejectDay?.(key)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-wt-text-muted">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2" />
              </tr>
            ) : null}
          </tfoot>
        </table>
      </div>
      {!readOnly ? (
        <button type="button" className="btn-ghost px-3 py-1.5 text-sm border border-wt-border rounded-lg" onClick={addRow}>
          Add row
        </button>
      ) : null}
    </div>
  );
}

export type { TimelogOptionsPayload };
