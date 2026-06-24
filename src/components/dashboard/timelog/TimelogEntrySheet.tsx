"use client";

import { useCallback, useEffect, useState } from "react";
import {
  subCategoriesFor,
  subCategoryRequired,
  type TimelogProjectOption,
} from "@/utils/timelog/categories";
import type { TimelogGridRow } from "@/utils/timelog/gridState";

type TimelogEntrySheetProps = {
  open: boolean;
  entry: TimelogGridRow | null;
  dayDates: Date[];
  dayKeys: string[];
  projectOptions: TimelogProjectOption[];
  actionLoading: boolean;
  onSave: (row: TimelogGridRow) => Promise<void>;
  onSubmit: (row: TimelogGridRow) => Promise<void>;
  onClose: () => void;
};

function emptyHours(dayKeys: string[]): Record<string, string> {
  const h: Record<string, string> = {};
  for (const k of dayKeys) h[k] = "";
  return h;
}

export function TimelogEntrySheet({
  open,
  entry,
  dayDates,
  dayKeys,
  projectOptions,
  actionLoading,
  onSave,
  onSubmit,
  onClose,
}: TimelogEntrySheetProps) {
  const isNew = !entry;
  const [projectCode, setProjectCode] = useState("");
  const [taskCategory, setTaskCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [comment, setComment] = useState("");
  const [hoursByDate, setHoursByDate] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setProjectCode(entry.project_code);
      setTaskCategory(entry.task_category);
      setSubCategory(entry.sub_category);
      setComment(entry.comment);
      setHoursByDate({ ...entry.hours_by_date });
    } else {
      setProjectCode("");
      setTaskCategory("");
      setSubCategory("");
      setComment("");
      setHoursByDate(emptyHours(dayKeys));
    }
    setLocalError(null);
  }, [open, entry, dayKeys]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!projectCode) { setTaskCategory(""); setSubCategory(""); return; }
    const opt = projectOptions.find((p) => p.project_code === projectCode);
    const cats = opt?.task_categories ?? [];
    if (cats.length && !cats.some((c) => c.value === taskCategory)) {
      setTaskCategory(cats[0].value);
      setSubCategory("");
    }
  }, [projectCode, projectOptions, taskCategory]);

  const selectedProject = projectOptions.find((p) => p.project_code === projectCode);
  const taskOptions = selectedProject?.task_categories ?? [];
  const subOptions = projectCode && taskCategory ? subCategoriesFor(projectCode, taskCategory) : [];

  const isSubRequired = subCategoryRequired(projectCode, taskCategory);

  const buildRow = useCallback((): TimelogGridRow => {
    const clientKey = entry?.clientKey ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      clientKey,
      project_code: projectCode,
      task_category: taskCategory,
      sub_category: subCategory,
      comment,
      hours_by_date: hoursByDate,
      entry_ids_by_date: entry?.entry_ids_by_date,
      status_by_date: entry?.status_by_date,
    };
  }, [entry, projectCode, taskCategory, subCategory, comment, hoursByDate]);

  const handleSave = useCallback(async () => {
    setLocalError(null);
    if (!projectCode) { setLocalError("Select a project."); return; }
    if (!taskCategory) { setLocalError("Select a task category."); return; }
    if (isSubRequired && !subCategory) { setLocalError("Select a sub category."); return; }
    const hasHours = dayKeys.some((k) => {
      const v = Number(hoursByDate[k]);
      return Number.isFinite(v) && v > 0;
    });
    if (!hasHours) { setLocalError("Enter at least one hour value."); return; }
    await onSave(buildRow());
  }, [projectCode, taskCategory, subCategory, isSubRequired, dayKeys, hoursByDate, onSave, buildRow]);

  const handleSubmit = useCallback(async () => {
    setLocalError(null);
    if (!projectCode) { setLocalError("Select a project."); return; }
    if (!taskCategory) { setLocalError("Select a task category."); return; }
    if (isSubRequired && !subCategory) { setLocalError("Select a sub category."); return; }
    const hasHours = dayKeys.some((k) => {
      const v = Number(hoursByDate[k]);
      return Number.isFinite(v) && v > 0;
    });
    if (!hasHours) { setLocalError("Enter at least one hour value."); return; }
    await onSubmit(buildRow());
  }, [projectCode, taskCategory, subCategory, isSubRequired, dayKeys, hoursByDate, onSubmit, buildRow]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="absolute right-0 top-0 h-full w-full max-w-lg flex flex-col bg-wt-surface-1 shadow-xl border-l border-wt-border animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-wt-border px-5 py-4">
          <h2 className="text-lg font-semibold">
            {isNew ? "Add entry" : "Edit entry"}
          </h2>
          <button
            type="button"
            className="btn-ghost rounded-lg border border-wt-border px-3 py-1.5 text-sm"
            onClick={onClose}
            disabled={actionLoading}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 px-5 py-4">
          {localError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {localError}
            </div>
          ) : null}

          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
            <span className="inline-flex items-baseline gap-0.5">
              <span>Project</span>
              <span className="shrink-0 text-rose-600 leading-none">*</span>
            </span>
            <select
              className="input-field w-full px-3 py-2 text-sm"
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
            >
              <option value="">Select project</option>
              {projectOptions.map((p) => (
                <option key={p.project_code} value={p.project_code}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
            <span className="inline-flex items-baseline gap-0.5">
              <span>Task category</span>
              <span className="shrink-0 text-rose-600 leading-none">*</span>
            </span>
            {!projectCode ? (
              <span className="text-wt-text-muted text-xs py-2 italic">Select a project first</span>
            ) : (
              <select
                className="input-field w-full px-3 py-2 text-sm"
                value={taskCategory}
                onChange={(e) => { setTaskCategory(e.target.value); setSubCategory(""); }}
              >
                <option value="">Select task</option>
                {taskOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            )}
          </label>

          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
            <span className="inline-flex items-baseline gap-0.5">
              <span>Sub category</span>
              {isSubRequired ? <span className="shrink-0 text-rose-600 leading-none">*</span> : null}
            </span>
            {!projectCode ? (
              <span className="text-wt-text-muted text-xs py-2 italic">Select a project first</span>
            ) : !taskCategory ? (
              <span className="text-wt-text-muted text-xs py-2 italic">Select a task category first</span>
            ) : subOptions.length ? (
              <select
                className="input-field w-full px-3 py-2 text-sm"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
              >
                <option value="">
                  {isSubRequired ? "Select sub category" : "\u2014"}
                </option>
                {subOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <span className="text-wt-text-muted text-xs py-2">\u2014</span>
            )}
          </label>

          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
            <span>Description</span>
            <textarea
              className="input-field w-full min-h-[80px] px-3 py-2 text-sm resize-y"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comment"
              rows={3}
            />
          </label>

          <fieldset>
            <legend className="text-xs text-wt-text-muted mb-2 font-medium">Hours</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {dayDates.map((d, i) => {
                const key = dayKeys[i];
                const dayAbbr = d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0);
                const dayNum = d.getDate();
                const monthNum = d.getMonth() + 1;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <label key={key} className="flex flex-col items-center gap-1 text-xs">
                    <span className={`font-medium ${isWeekend ? "text-red-500" : "text-wt-text-muted"}`}>
                      {dayAbbr} - {dayNum}/{monthNum}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`input-field w-full px-1 py-1.5 text-xs text-center tabular-nums ${isWeekend ? "border-red-300 focus:border-red-500" : ""}`}
                      value={hoursByDate[key] ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw !== "" && !/^\d*\.?\d{0,2}$/.test(raw)) return;
                        const num = Number(raw);
                        if (raw !== "" && Number.isFinite(num) && num > 24) return;
                        setHoursByDate((prev) => ({ ...prev, [key]: raw }));
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="flex items-center gap-2 border-t border-wt-border px-5 py-4">
          <button
            type="button"
            className="btn-ghost px-4 py-2 text-sm border border-wt-border rounded-lg"
            disabled={actionLoading}
            onClick={() => void handleSave()}
          >
            {actionLoading ? "Saving\u2026" : "Save Draft"}
          </button>
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm"
            disabled={actionLoading}
            onClick={() => void handleSubmit()}
          >
            {actionLoading ? "Submitting\u2026" : "Submit for Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
