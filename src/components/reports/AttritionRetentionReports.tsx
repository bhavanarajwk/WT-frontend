"use client";

import type { ReactNode } from "react";
import { SelectField } from "@/components/dashboard/ui/forms";

const COLUMN_LABELS: Record<string, string> = {
  fy_start_year: "FY start year",
  fy_april_start: "FY start (Apr)",
  fy_march_end: "FY end (Mar)",
  number_of_exits: "Exits",
  attrition_percent: "Attrition %",
  voluntary_count: "Voluntary",
  involuntary_count: "Involuntary",
  total_count: "Total exits",
  role_or_designation: "Role / designation",
  exit_count: "Exits",
  reporting_manager: "Reporting manager",
  critical_skill: "Critical skill",
  total_regretted_exits: "Regretted exits",
  percent_of_total_attrition: "% of total attrition",
  tenure_bucket: "Tenure bucket",
  range_days: "Day range",
  number_of_employees: "Employees",
  average_tenure_days: "Avg tenure (days)",
  tenure_unknown_employees: "Tenure unknown",
  emp_id: "Employee ID",
  employee_name: "Name",
  separation_type: "Separation",
  reason: "Reason",
  is_regretted: "Regretted",
  last_working_day: "Last working day",
  designation: "Designation",
  band_name: "Band",
  band_role: "Band role",
  project_manager: "Project manager",
};

function labelForColumn(key: string): string {
  return COLUMN_LABELS[key] ?? key.replaceAll("_", " ");
}

function formatCell(column: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (column.includes("percent") && typeof value === "number") return `${value}%`;
  if (column === "attrition_percent" && typeof value === "number") return `${value}%`;
  if (column === "is_regretted") {
    if (value === true || value === "true") return "Yes";
    if (value === false || value === "false") return "No";
  }
  return String(value);
}

function firstRow(rows: Array<Record<string, unknown>>): Record<string, unknown> | null {
  return rows[0] ?? null;
}

function ReportMetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "rose" | "emerald" | "sky" | "amber" | "default";
}) {
  const accentClass =
    accent === "rose"
      ? "text-rose-700"
      : accent === "emerald"
        ? "text-emerald-700"
        : accent === "sky"
          ? "text-sky-700"
          : accent === "amber"
            ? "text-amber-700"
            : "text-wt-text";

  return (
    <article className="rounded-xl border border-wt-border bg-wt-surface-1 p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">{label}</p>
      <p className={`text-2xl font-semibold mt-2 tabular-nums ${accentClass}`}>{value}</p>
      {hint ? <p className="text-xs text-wt-text-muted mt-1">{hint}</p> : null}
    </article>
  );
}

function ReportTableCard({
  title,
  description,
  columns,
  rows,
  emptyLabel,
}: {
  title: string;
  description?: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-wt-border bg-wt-surface-1 overflow-hidden shadow-sm">
      <div className="border-b border-wt-border bg-wt-surface-2/80 px-4 py-3 sm:px-5">
        <h4 className="font-semibold text-sm">{title}</h4>
        {description ? <p className="text-xs text-wt-text-muted mt-0.5">{description}</p> : null}
      </div>
      {!rows.length ? (
        <p className="px-4 py-8 text-sm text-wt-text-muted text-center sm:px-5">{emptyLabel}</p>
      ) : (
        <div className="wt-scroll-both max-h-[min(360px,50vh)] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-wt-surface-2 text-wt-text-muted">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left px-4 py-2.5 font-medium whitespace-nowrap text-xs uppercase tracking-wide"
                  >
                    {labelForColumn(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-t border-wt-border hover:bg-wt-surface-2/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-2.5 whitespace-nowrap text-wt-text">
                      {formatCell(col, row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AttritionRetentionReports({
  fyStartYear,
  onFyStartYearChange,
  overallRows,
  voluntaryRows,
  roleWiseRows,
  managerWiseRows,
  criticalSkillRows,
  regrettedRows,
  tenureBucketRows,
  tenureSummaryRows,
}: {
  fyStartYear: string;
  onFyStartYearChange: (year: string) => void;
  overallRows: Array<Record<string, unknown>>;
  voluntaryRows: Array<Record<string, unknown>>;
  roleWiseRows: Array<Record<string, unknown>>;
  managerWiseRows: Array<Record<string, unknown>>;
  criticalSkillRows: Array<Record<string, unknown>>;
  regrettedRows: Array<Record<string, unknown>>;
  tenureBucketRows: Array<Record<string, unknown>>;
  tenureSummaryRows: Array<Record<string, unknown>>;
}) {
  const overall = firstRow(overallRows);
  const voluntary = firstRow(voluntaryRows);
  const regretted = firstRow(regrettedRows);
  const tenureSummary = firstRow(tenureSummaryRows);

  const attritionPct = overall?.attrition_percent;
  const retentionPct =
    attritionPct !== null && attritionPct !== undefined && attritionPct !== ""
      ? `${Math.max(0, 100 - Number(attritionPct)).toFixed(1)}%`
      : "—";

  const fyOptions = Array.from(
    { length: Math.max(new Date().getFullYear() - 2019 + 1, 1) },
    (_, idx) => String(2019 + idx)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="text-lg font-semibold">Attrition &amp; retention</h4>
          <p className="text-sm text-wt-text-muted mt-1 max-w-2xl">
            Financial-year metrics for exits, regretted loss, tenure, and voluntary vs involuntary split.
          </p>
        </div>
        <SelectField
          label="Financial year (start)"
          className="min-w-[10rem]"
          value={fyStartYear}
          onChange={onFyStartYearChange}
          options={fyOptions.map((year) => ({
            value: year,
            label: `FY ${year}–${String(Number(year) + 1).slice(-2)}`,
          }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetricCard
          label="Overall attrition"
          value={formatCell("attrition_percent", overall?.attrition_percent)}
          hint={
            overall?.number_of_exits != null
              ? `${overall.number_of_exits} exit(s) in selected FY`
              : undefined
          }
          accent="rose"
        />
        <ReportMetricCard label="Retention rate" value={retentionPct} hint="100% − attrition %" accent="emerald" />
        <ReportMetricCard
          label="Regretted exits"
          value={formatCell("total_regretted_exits", regretted?.total_regretted_exits)}
          hint={formatCell("percent_of_total_attrition", regretted?.percent_of_total_attrition)}
          accent="amber"
        />
        <ReportMetricCard
          label="Avg tenure at exit"
          value={formatCell("average_tenure_days", tenureSummary?.average_tenure_days)}
          hint={
            tenureSummary?.tenure_unknown_employees != null
              ? `${tenureSummary.tenure_unknown_employees} unknown tenure`
              : undefined
          }
          accent="sky"
        />
      </div>

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-4 sm:p-5">
        <h4 className="text-sm font-semibold mb-4">Voluntary vs involuntary</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <ReportMetricCard
            label="Voluntary"
            value={formatCell("voluntary_count", voluntary?.voluntary_count)}
            accent="sky"
          />
          <ReportMetricCard
            label="Involuntary"
            value={formatCell("involuntary_count", voluntary?.involuntary_count)}
            accent="rose"
          />
          <ReportMetricCard label="Total" value={formatCell("total_count", voluntary?.total_count)} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportTableCard
          title="Role-wise attrition"
          description="Exits grouped by role or designation"
          columns={["role_or_designation", "exit_count"]}
          rows={roleWiseRows}
          emptyLabel="No role-wise exits for this FY."
        />
        <ReportTableCard
          title="Manager-wise attrition"
          description="Exits by reporting manager"
          columns={["reporting_manager", "exit_count"]}
          rows={managerWiseRows}
          emptyLabel="No manager-wise exits for this FY."
        />
        <ReportTableCard
          title="Critical skill attrition"
          description="Exits where a critical skill was flagged"
          columns={["critical_skill", "exit_count"]}
          rows={criticalSkillRows}
          emptyLabel="No critical-skill exits for this FY."
        />
        <ReportTableCard
          title="Tenure at exit"
          description="How long employees stayed before leaving"
          columns={["tenure_bucket", "range_days", "number_of_employees"]}
          rows={tenureBucketRows}
          emptyLabel="No tenure bucket data for this FY."
        />
      </div>
    </div>
  );
}
