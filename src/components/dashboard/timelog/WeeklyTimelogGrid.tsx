"use client";

import {
  subCategoriesFor,
  subCategoryRequired,
  TASK_CATEGORY_LABELS,
  type TimelogOptionsPayload,
  type TimelogProjectOption,
} from "@/utils/timelog/categories";
import { dailyTotals, isDailyOverThreshold, rowTotal, weeklyTotal } from "@/utils/timelog/gridTotals";
import type { TimelogGridRow } from "@/utils/timelog/gridState";
import { formatDayHeader } from "@/utils/timelog/weekDates";

type WeeklyTimelogGridProps = {
  rows: TimelogGridRow[];
  dayDates: Date[];
  dayKeys: string[];
  projectOptions: TimelogProjectOption[];
  readOnly?: boolean;
  onRowsChange: (rows: TimelogGridRow[]) => void;
  onApproveEntry?: (entryId: number) => void;
  onRejectEntry?: (entryId: number) => void;
  canApprove?: boolean;
};

function updateRow(rows: TimelogGridRow[], clientKey: string, patch: Partial<TimelogGridRow>): TimelogGridRow[] {
  return rows.map((row) => (row.clientKey === clientKey ? { ...row, ...patch } : row));
}

export function WeeklyTimelogGrid({
  rows,
  dayDates,
  dayKeys,
  projectOptions,
  readOnly = false,
  onRowsChange,
  onApproveEntry,
  onRejectEntry,
  canApprove = false,
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

  const removeRow = (clientKey: string) => {
    const next = rows.filter((r) => r.clientKey !== clientKey);
    onRowsChange(next.length ? next : rows.slice(0, 1));
  };

  return (
    <div className="space-y-3">
      <div className="wt-scroll-both overflow-x-auto rounded-xl border border-wt-border">
        <table className="min-w-[960px] w-full text-sm border-collapse">
          <thead className="bg-wt-surface-2 text-wt-text-muted">
            <tr>
              <th className="text-left px-2 py-2 font-medium min-w-[140px]">Project</th>
              <th className="text-left px-2 py-2 font-medium min-w-[120px]">Task Category</th>
              <th className="text-left px-2 py-2 font-medium min-w-[140px]">Sub category</th>
              <th className="text-left px-2 py-2 font-medium min-w-[120px]">Comment</th>
              {dayDates.map((d, i) => (
                <th key={dayKeys[i]} className="text-center px-2 py-2 font-medium min-w-[72px] whitespace-nowrap">
                  {formatDayHeader(d)}
                </th>
              ))}
              <th className="text-center px-2 py-2 font-medium min-w-[64px]">Total</th>
              {!readOnly ? <th className="w-10" aria-label="Remove row" /> : null}
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

              return (
                <tr key={row.clientKey} className="border-t border-wt-border align-top">
                  <td className="px-2 py-2">
                    <select
                      className="input-field w-full px-2 py-1.5 text-sm"
                      disabled={readOnly}
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
                      disabled={readOnly || !row.project_code}
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
                        disabled={readOnly || !row.task_category}
                        value={row.sub_category}
                        onChange={(e) =>
                          onRowsChange(updateRow(rows, row.clientKey, { sub_category: e.target.value }))
                        }
                      >
                        <option value="">
                          {subCategoryRequired(row.project_code, row.task_category) ? "Select sub category" : "—"}
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
                  <td className="px-2 py-2">
                    <input
                      className="input-field w-full px-2 py-1.5 text-sm"
                      disabled={readOnly}
                      value={row.comment}
                      onChange={(e) =>
                        onRowsChange(updateRow(rows, row.clientKey, { comment: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </td>
                  {dayKeys.map((key) => {
                    const entryId = row.entry_ids_by_date?.[key];
                    const status = row.status_by_date?.[key];
                    const approved = status === "APPROVED";
                    return (
                      <td key={key} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          className="input-field w-full max-w-[4.5rem] mx-auto px-1 py-1.5 text-sm text-center"
                          disabled={readOnly || approved}
                          value={row.hours_by_date[key] ?? ""}
                          onChange={(e) => {
                            const hours_by_date = { ...row.hours_by_date, [key]: e.target.value };
                            onRowsChange(updateRow(rows, row.clientKey, { hours_by_date }));
                          }}
                        />
                        {canApprove && entryId ? (
                          <div className="mt-1 flex flex-wrap justify-center gap-1">
                            <button
                              type="button"
                              className="text-[10px] px-1 rounded border border-emerald-200 text-emerald-700 disabled:opacity-40"
                              disabled={approved}
                              onClick={() => onApproveEntry?.(entryId)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="text-[10px] px-1 rounded border border-rose-200 text-rose-700 disabled:opacity-40"
                              disabled={approved}
                              onClick={() => onRejectEntry?.(entryId)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : status ? (
                          <p className="text-[10px] text-wt-text-muted mt-1">{status}</p>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center font-medium whitespace-nowrap">{total || "—"}</td>
                  {!readOnly ? (
                    <td className="px-1 py-2 text-center">
                      <button
                        type="button"
                        className="text-wt-text-muted hover:text-rose-600 text-lg leading-none"
                        aria-label="Remove row"
                        onClick={() => removeRow(row.clientKey)}
                      >
                        ×
                      </button>
                    </td>
                  ) : null}
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
                    className={`px-2 py-2 text-center ${
                      isDailyOverThreshold(total) ? "bg-amber-100 text-amber-900" : ""
                    }`}
                  >
                    {total > 0 ? total : "—"}
                  </td>
                );
              })}
              <td className="px-2 py-2 text-center">{weekSum > 0 ? weekSum : "—"}</td>
              {!readOnly ? <td /> : null}
            </tr>
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
