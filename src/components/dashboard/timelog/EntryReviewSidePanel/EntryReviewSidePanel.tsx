"use client";

import { Button } from "@/components/ui/button";
import { WtLoaderCentered } from "@/components/dashboard/ui/WtLoader";
import { TASK_CATEGORY_LABELS } from "@/utils/timelog/categories";
import { formatDayHeader } from "@/utils/timelog/weekDates";
import { useMemo, useState } from "react";
import "./EntryReviewSidePanel.css";
import type { TimelogGridRow } from "@/utils/timelog/gridState";

type EntryReviewSidePanelProps = {
  row: TimelogGridRow;
  dayKeys: string[];
  dayDates: Date[];
  employeeEmail: string;
  actionLoading: boolean;
  onApprove: (remark: string) => void;
  onReject: (remark: string) => void;
  onClose: () => void;
};

export function EntryReviewSidePanel({
  row,
  dayKeys,
  dayDates,
  employeeEmail,
  actionLoading,
  onApprove,
  onReject,
  onClose,
}: EntryReviewSidePanelProps) {
  const existingRemark = useMemo(() => {
    for (const key of dayKeys) {
      const c = row.manager_comment_by_date?.[key];
      if (c) return c;
    }
    return "";
  }, [row.manager_comment_by_date, dayKeys]);
  const [remark, setRemark] = useState(existingRemark);

  const taskLabel = TASK_CATEGORY_LABELS[row.task_category] ?? row.task_category;

  return (
    <div className="entry-review-overlay" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="entry-review-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="entry-review-header">
          <h2 className="entry-review-title">Review Entry</h2>
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={actionLoading}>
            Close
          </Button>
        </div>

        <div className="entry-review-body">
          <div className="entry-review-field">
            <span className="entry-review-label">Employee</span>
            <span>{employeeEmail}</span>
          </div>
          <div className="entry-review-field">
            <span className="entry-review-label">Project</span>
            <span>{row.project_name || row.project_code}</span>
          </div>
          <div className="entry-review-field">
            <span className="entry-review-label">Task</span>
            <span>{taskLabel}{row.sub_category ? ` / ${row.sub_category}` : ""}</span>
          </div>
          {row.comment ? (
            <div className="entry-review-field">
              <span className="entry-review-label">Description</span>
              <span>{row.comment}</span>
            </div>
          ) : null}

          <div className="entry-review-days">
            <span className="entry-review-label">Daily hours</span>
            <div className="entry-review-day-grid">
              {dayKeys.map((key, i) => {
                const hours = row.hours_by_date[key];
                const status = row.status_by_date?.[key];
                if (!hours || hours === "0" || hours === "0.00") return null;
                return (
                  <div key={key} className="entry-review-day-cell">
                    <div className="entry-review-day-header">{formatDayHeader(dayDates[i])}</div>
                    <div className="entry-review-day-hours">{hours}h</div>
                    {status ? (
                      <span className={`entry-review-status entry-review-status--${status.toLowerCase()}`}>
                        {status}
                      </span>
                    ) : null}
                    {row.manager_comment_by_date?.[key] ? (
                      <div className="entry-review-day-remark">{row.manager_comment_by_date[key]}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="entry-review-remark">
            <span className="entry-review-label">Remark (optional)</span>
            <textarea
              className="entry-review-textarea"
              placeholder="Add a remark..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              disabled={actionLoading}
            />
          </div>
        </div>

        <div className="entry-review-footer">
          {actionLoading ? (
            <WtLoaderCentered label="" />
          ) : (
            <>
              <Button
                variant="destructive"
                size="sm"
                type="button"
                onClick={() => onReject(remark.trim())}
              >
                Reject
              </Button>
              <Button
                variant="brand"
                size="sm"
                type="button"
                onClick={() => onApprove(remark.trim())}
              >
                Approve
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
