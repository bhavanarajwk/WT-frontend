"use client";

import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
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

      {loading ? <SectionLoading label="Loading…" /> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {!loading && !error && rows.length ? (
        <ScrollableTable maxHeightClass="max-h-48" className="!rounded-lg">
          <WtTable>
            <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead>Employee</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Leave date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`${row.employee_email ?? idx}`}>
                  <TableCell className="px-3 py-2 whitespace-nowrap">
                    {row.employee_name ?? row.employee_email ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap">
                    {row.project_name ?? row.project_code ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap">{row.leave_date ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </WtTable>
        </ScrollableTable>
      ) : null}

      {!loading && !error && !rows.length ? (
        <p className="text-sm text-wt-text-muted">No team members on approved leave for this date.</p>
      ) : null}
    </section>
  );
}
