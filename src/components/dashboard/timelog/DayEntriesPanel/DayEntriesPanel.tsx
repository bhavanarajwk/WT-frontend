"use client";

import { Button } from "@/components/ui/button";
import { WtLoaderCentered } from "@/components/dashboard/ui/WtLoader";
import { formatTimelogTableDate } from "@/utils/timelog/weekDates";
import { TASK_CATEGORY_LABELS } from "@/utils/timelog/categories";
import "./DayEntriesPanel.css";
import type { DayEntriesPanelProps } from "./DayEntriesPanel.types";

function statusClass(status: string): string {
  const key = status.toLowerCase();
  const map: Record<string, string> = {
    draft: "day-entries-card-status--draft",
    submitted: "day-entries-card-status--submitted",
    approved: "day-entries-card-status--approved",
    rejected: "day-entries-card-status--rejected",
  };
  return map[key] ?? "day-entries-card-status--draft";
}

function canEdit(status: string): boolean {
  return status === "DRAFT" || status === "REJECTED";
}

export function DayEntriesPanel({
  selectedDate,
  entries,
  totalHours,
  loading,
  actionLoading,
  error,
  onAdd,
  onEdit,
  onDelete,
  onSubmit,
  onClose,
}: DayEntriesPanelProps) {
  if (!selectedDate) return null;

  const dateLabel = selectedDate
    ? formatTimelogTableDate(selectedDate)
    : "";

  const hasSubmittable = entries.some((e) => canEdit(e.status));

  return (
    <div className="day-entries-overlay" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="day-entries-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="day-entries-header">
          <h2 className="day-entries-title">Entries for {dateLabel}</h2>
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={actionLoading}>
            Close
          </Button>
        </div>

        <div className="day-entries-body">
          {error ? <div className="day-entries-error">{error}</div> : null}

          {loading ? (
            <div className="day-entries-empty">
              <WtLoaderCentered label="Loading entries" />
            </div>
          ) : (
            <>
              <Button
                variant="brand"
                size="sm"
                type="button"
                disabled={actionLoading}
                onClick={onAdd}
                className="w-full"
              >
                Add entry
              </Button>

              {entries.length === 0 ? (
                <div className="day-entries-empty">
                  No entries for this date. Click &ldquo;Add entry&rdquo; to log hours.
                </div>
              ) : (
                [...entries].reverse().map((entry) => {
              const taskLabel = TASK_CATEGORY_LABELS[entry.task_category] ?? entry.task_category;
              return (
                <div key={entry.id} className="day-entries-card">
                  <div className="day-entries-card-header">
                    <div>
                      <div className="day-entries-card-project">{entry.project_code}</div>
                      <div className="day-entries-card-task">
                        {taskLabel}
                        {entry.sub_category ? ` / ${entry.sub_category}` : ""}
                      </div>
                    </div>
                    <div className="day-entries-card-hours">{entry.hours}h</div>
                  </div>
                  {entry.description ? (
                    <div className="day-entries-card-desc">{entry.description}</div>
                  ) : null}
                  <div>
                    <span className={`day-entries-card-status ${statusClass(entry.status)}`}>
                      {entry.status}
                    </span>
                    {entry.manager_comment ? (
                      <div className="day-entries-card-remark">
                        Remark: {entry.manager_comment}
                      </div>
                    ) : null}
                  </div>
                  {canEdit(entry.status) ? (
                    <div className="day-entries-card-actions">
                      <Button
                        variant="outline"
                        size="xs"
                        type="button"
                        disabled={actionLoading}
                        onClick={() => onEdit(entry)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        type="button"
                        disabled={actionLoading}
                        onClick={() => onDelete(entry.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
            </>
          )}
        </div>

        <div className="day-entries-footer">
          <span className="day-entries-total">
            Total: {totalHours}h ({entries.length} {entries.length === 1 ? "entry" : "entries"})
          </span>
          <div className="day-entries-footer-actions">
            <Button
              variant="brand"
              size="sm"
              type="button"
              disabled={actionLoading || !hasSubmittable}
              onClick={onSubmit}
              title={hasSubmittable ? "Submit all draft entries for this date" : "No draft entries to submit"}
            >
              {actionLoading ? "Submitting\u2026" : hasSubmittable ? "Submit All" : "All Submitted"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
