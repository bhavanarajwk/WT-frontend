"use client";

import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { WtLoaderCentered } from "@/components/dashboard/ui/WtLoader";
import { TASK_CATEGORY_LABELS } from "@/utils/timelog/categories";
import { formatTimelogTableDate } from "@/utils/timelog/weekDates";
import "./TimelogTable.css";
import type { TimelogTableProps } from "./TimelogTable.types";

function statusClass(status: string): string {
  const key = status.toLowerCase();
  const map: Record<string, string> = {
    draft: "timelog-table-status--draft",
    submitted: "timelog-table-status--submitted",
    approved: "timelog-table-status--approved",
    rejected: "timelog-table-status--rejected",
  };
  return map[key] ?? "timelog-table-status--draft";
}

export function TimelogTable({
  entries,
  total,
  page,
  size,
  loading,
  onPageChange,
}: TimelogTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const startItem = total === 0 ? 0 : page * size + 1;
  const endItem = Math.min((page + 1) * size, total);

  return (
    <div className="timelog-table-wrapper">
      <table className="timelog-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Project</th>
            <th>Task</th>
            <th>Sub category</th>
            <th>Hours</th>
            <th>Description</th>
            <th>Status</th>
            <th>Manager remarks</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} className="timelog-table-empty">
                <WtLoaderCentered label="Loading entries" />
              </td>
            </tr>
          ) : entries.length === 0 ? (
            <tr>
              <td colSpan={8} className="timelog-table-empty">
                No timelog entries found.
              </td>
            </tr>
          ) : (
            entries.map((entry) => {
              const taskLabel =
                TASK_CATEGORY_LABELS[entry.task_category] ?? entry.task_category;
              return (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap">
                    {formatTimelogTableDate(entry.log_date)}
                  </td>
                  <td className="whitespace-nowrap font-medium">
                    {entry.project_code}
                  </td>
                  <td className="whitespace-nowrap">{taskLabel}</td>
                  <td className="whitespace-nowrap">
                    {entry.sub_category || "\u2014"}
                  </td>
                  <td className="whitespace-nowrap tabular-nums font-medium">
                    {entry.hours}h
                  </td>
                  <td className="max-w-[200px] truncate">
                    {entry.description || "\u2014"}
                  </td>
                  <td className="whitespace-nowrap">
                    <span
                      className={`timelog-table-status ${statusClass(entry.status)}`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate text-wt-text-muted text-xs">
                    {entry.manager_comment || "\u2014"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {total > size ? (
        <div className="timelog-table-footer">
          <ListPagination
            className="mt-0 w-full"
            page={page}
            totalPages={totalPages}
            totalItems={total}
            rangeStart={startItem}
            rangeEnd={endItem}
            pageSize={size}
            loading={loading}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </div>
  );
}
