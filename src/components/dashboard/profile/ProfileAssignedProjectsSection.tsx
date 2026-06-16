"use client";

import { formatApiDateDisplay } from "@/utils/apiDate";
import {
  PROFILE_TABLE_BODY_CELL,
  PROFILE_TABLE_HEAD_CELL,
  PROFILE_TABLE_SCROLL,
} from "@/components/dashboard/profile/profileTableStyles";

function displayValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text !== "—" ? text : "—";
}

function readProjectName(row: Record<string, unknown>): string {
  return displayValue(row.project_name ?? row.projectName ?? row.name);
}

function readProjectRole(row: Record<string, unknown>): string {
  return displayValue(row.role ?? row.designation);
}

function readProjectStartDate(row: Record<string, unknown>): string {
  const raw = row.start_date ?? row.startDate;
  const text = String(raw ?? "").trim();
  if (!text || text === "—") return "—";
  return formatApiDateDisplay(text);
}

function readProjectEndDate(row: Record<string, unknown>): string {
  const raw = row.end_date ?? row.endDate;
  const text = String(raw ?? "").trim();
  if (!text || text === "—") return "—";
  return formatApiDateDisplay(text);
}

function readProjectStatus(row: Record<string, unknown>): string {
  return displayValue(
    row.project_status ??
      row.projectStatus ??
      row.status ??
      row.billing_status ??
      row.billingStatus
  );
}

function projectRowKey(row: Record<string, unknown>, index: number): string {
  const code = String(row.project_code ?? row.projectCode ?? "").trim();
  const start = String(row.start_date ?? row.startDate ?? "").trim();
  return [code, start, index].filter(Boolean).join("|");
}

export function ProfileAssignedProjectsSection({
  rows,
  loading,
}: {
  rows: Array<Record<string, unknown>>;
  loading: boolean;
}) {
  return (
    <div className="mt-8 border-t border-wt-border pt-6">
      <h4 className="mb-3 text-sm font-semibold text-wt-text">Project Details</h4>
        {loading ? (
          <p className="text-sm text-wt-text-muted">Loading assigned projects…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-wt-text-muted">No projects assigned.</p>
        ) : (
          <div className={PROFILE_TABLE_SCROLL}>
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-wt-surface-2 text-wt-text-muted">
                <tr>
                  <th className={PROFILE_TABLE_HEAD_CELL}>Project Name</th>
                  <th className={PROFILE_TABLE_HEAD_CELL}>Role In Project</th>
                  <th className={PROFILE_TABLE_HEAD_CELL}>Start Date</th>
                  <th className={PROFILE_TABLE_HEAD_CELL}>End Date</th>
                  <th className={PROFILE_TABLE_HEAD_CELL}>Project Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={projectRowKey(row, index)} className="border-t border-wt-border">
                    <td className={`${PROFILE_TABLE_BODY_CELL} whitespace-nowrap`}>
                      {readProjectName(row)}
                    </td>
                    <td className={PROFILE_TABLE_BODY_CELL}>{readProjectRole(row)}</td>
                    <td className={`${PROFILE_TABLE_BODY_CELL} whitespace-nowrap`}>
                      {readProjectStartDate(row)}
                    </td>
                    <td className={`${PROFILE_TABLE_BODY_CELL} whitespace-nowrap`}>
                      {readProjectEndDate(row)}
                    </td>
                    <td className={`${PROFILE_TABLE_BODY_CELL} whitespace-nowrap`}>
                      {readProjectStatus(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
