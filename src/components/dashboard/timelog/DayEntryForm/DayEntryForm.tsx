"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  subCategoriesFor,
  subCategoryRequired,
  taskCategoriesForProject,
  TASK_CATEGORY_LABELS,
} from "@/utils/timelog/categories";
import "./DayEntryForm.css";
import type { DayEntryFormProps } from "./DayEntryForm.types";
import type { DayTimelogEntryForm } from "@/hooks/timelog/useDayTimelog.types";

function emptyForm(): DayTimelogEntryForm {
  return {
    project_code: "",
    task_category: "",
    sub_category: "",
    description: "",
    hours: "",
  };
}

function formForEntry(entry: DayTimelogEntryForm | null): DayTimelogEntryForm {
  if (!entry) return emptyForm();
  return {
    project_code: entry.project_code ?? "",
    task_category: entry.task_category ?? "",
    sub_category: entry.sub_category ?? "",
    description: entry.description ?? "",
    hours: String(entry.hours ?? ""),
  };
}

export function DayEntryForm({
  entry,
  projectOptions,
  actionLoading,
  onSave,
  onSaveAndSubmit,
  onUpdate,
  dayTotalHours,
  selectedDate,
  onCancel,
}: DayEntryFormProps) {
  const [form, setForm] = useState<DayTimelogEntryForm>(() => formForEntry(entry as unknown as DayTimelogEntryForm | null));
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const isNew = !entry;

  useEffect(() => {
    setForm(formForEntry(entry as unknown as DayTimelogEntryForm | null));
    setLocalError(null);
  }, [entry]);

  const taskOptions = form.project_code
    ? taskCategoriesForProject(form.project_code).map((t) => ({
        value: t,
        label: TASK_CATEGORY_LABELS[t] ?? t,
      }))
    : [];
  const subOptions =
    form.project_code && form.task_category
      ? subCategoriesFor(form.project_code, form.task_category)
      : [];
  const isSubRequired =
    form.project_code
      ? subCategoryRequired(form.project_code, form.task_category)
      : false;

  useEffect(() => {
    if (!form.project_code) {
      setForm((prev) => ({ ...prev, task_category: "", sub_category: "" }));
      return;
    }
    const cats = taskCategoriesForProject(form.project_code);
    if (cats.length && !cats.includes(form.task_category)) {
      setForm((prev) => ({
        ...prev,
        task_category: cats[0],
        sub_category: "",
      }));
    }
  }, [form.project_code, form.task_category]);

  const validate = useCallback((): string | null => {
    if (!form.project_code) return "Select a project.";
    if (!form.task_category) return "Select a task category.";
    if (isSubRequired && !form.sub_category) return "Select a sub category.";
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (selectedDate > todayStr) return "Cannot log time for future dates.";
    const hours = Number(form.hours);
    if (!Number.isFinite(hours) || hours <= 0) return "Enter valid hours.";
    if (hours > 24) return "Single entry cannot exceed 24 hours.";
    const existing = entry ? dayTotalHours - entry.hours : dayTotalHours;
    if (existing + hours > 24) return "Total hours for this day would exceed 24.";
    return null;
  }, [form, isSubRequired, entry, dayTotalHours, selectedDate]);

  const handleSaveAndSubmit = useCallback(() => {
    const error = validate();
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    setPendingSubmit(true);
    Promise.resolve(onSaveAndSubmit(form)).finally(() => setPendingSubmit(false));
  }, [form, validate, onSaveAndSubmit]);

  const handleSave = useCallback(() => {
    const error = validate();
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    setPendingSave(true);
    const action = isNew ? onSave(form) : onUpdate(entry!.id, form);
    Promise.resolve(action).finally(() => setPendingSave(false));
  }, [form, validate, isNew, onSave, onUpdate, entry]);

  return (
    <div
      className="day-entry-form-overlay"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="day-entry-form-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="day-entry-form-header">
          <h2 className="day-entry-form-title">
            {isNew ? "Add entry" : "Edit entry"}
          </h2>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onCancel}
            disabled={actionLoading}
          >
            Cancel
          </Button>
        </div>

        <div className="day-entry-form-body">
          {localError ? (
            <div className="day-entry-form-error">{localError}</div>
          ) : null}

          <label className="day-entry-form-field">
            <span className="day-entry-form-label">
              Project <span className="day-entry-form-required">*</span>
            </span>
            <select
              className="day-entry-form-select"
              value={form.project_code}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  project_code: e.target.value,
                }))
              }
            >
              <option value="">Select project</option>
              {projectOptions.map((p) => (
                <option key={p.project_code} value={p.project_code}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </label>

          {form.project_code ? (
            <label className="day-entry-form-field">
              <span className="day-entry-form-label">
                Task category <span className="day-entry-form-required">*</span>
              </span>
              <select
                className="day-entry-form-select"
                value={form.task_category}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    task_category: e.target.value,
                    sub_category: "",
                  }))
                }
              >
                {taskOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {form.project_code && form.task_category && subOptions.length > 0 ? (
            <label className="day-entry-form-field">
              <span className="day-entry-form-label">
                Sub category
                {isSubRequired ? (
                  <span className="day-entry-form-required"> *</span>
                ) : null}
              </span>
              <select
                className="day-entry-form-select"
                value={form.sub_category}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sub_category: e.target.value,
                  }))
                }
              >
                {subOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {form.project_code && form.task_category ? (
            <label className="day-entry-form-field">
              <span className="day-entry-form-label">Description</span>
              <textarea
                className="day-entry-form-textarea"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional comment"
                rows={3}
              />
            </label>
          ) : null}

          {form.project_code && form.task_category ? (
            <label className="day-entry-form-field">
              <span className="day-entry-form-label">
                Hours <span className="day-entry-form-required">*</span>
              </span>
              <input
                type="text"
                inputMode="decimal"
                className="day-entry-form-input"
                value={form.hours}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw !== "" && !/^\d*\.?\d{0,2}$/.test(raw)) return;
                  setForm((prev) => ({ ...prev, hours: raw }));
                }}
                placeholder="0.5 - 24"
              />
            </label>
          ) : null}
        </div>

        <div className="day-entry-form-footer">
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={pendingSave || pendingSubmit}
            onClick={handleSave}
          >
            {pendingSave ? "Saving" : "Save Draft"}
          </Button>
          <Button
            variant="brand"
            size="sm"
            type="button"
            disabled={pendingSave || pendingSubmit}
            onClick={handleSaveAndSubmit}
          >
            {pendingSubmit ? "Submitting" : "Submit"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={actionLoading}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
