"use client";

import { useCallback, useEffect, useState } from "react";
import { hrmsService, type ManagerTeamOnLeaveRow } from "@/services/hrms.service";
import { todayApiDate } from "@/utils/apiDate";
import { InputField } from "@/components/dashboard/ui/forms";

export function ManagerTeamOnLeavePanel() {
  const [asOfDate, setAsOfDate] = useState(todayApiDate());
  const [rows, setRows] = useState<ManagerTeamOnLeaveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrmsService.getManagerTeamOnLeaveToday({ asOfDate });
      const data = res.data;
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Could not load team on leave.");
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  return (
    <section className="rounded-xl border border-wt-border bg-wt-surface-2 p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Team on leave today</p>
          <p className="text-xs text-wt-text-muted">Approved leave for your project teams.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <InputField label="As of date" type="date" value={asOfDate} onChange={setAsOfDate} />
          <button type="button" className="btn-ghost px-3 py-2 h-10 border border-wt-border" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-wt-text-muted">Loading…</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {!loading && !error && rows.length ? (
        <div className="wt-scroll-both max-h-48 rounded-lg border border-wt-border">
          <table className="min-w-full text-sm">
            <thead className="bg-wt-surface-1 text-wt-text-muted">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Employee</th>
                <th className="text-left px-3 py-2 font-medium">Project</th>
                <th className="text-left px-3 py-2 font-medium">Leave date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${row.employee_email ?? idx}`} className="border-t border-wt-border">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.employee_name ?? row.employee_email ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.project_name ?? row.project_code ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.leave_date ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && !error && !rows.length ? (
        <p className="text-sm text-wt-text-muted">No team members on approved leave for this date.</p>
      ) : null}
    </section>
  );
}
