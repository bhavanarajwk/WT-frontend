"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/error";
import {
  hrmsService,
  type EmployeeAttendanceLeaveData,
  type EmployeeAttendanceLeaveEmployeeRow,
} from "@/services/hrms.service";
import { DatePickerField } from "@/components/dashboard/ui/forms";
import { formatApiDate, formatApiDateDisplay } from "@/utils/apiDate";

type Toast = { type: "success" | "error"; message: string } | null;

const DEFAULT_PAGE_SIZE = 50;

function defaultAttendanceDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 4);
  return { from: formatApiDate(from), to: formatApiDate(to) };
}

function formatLeaveDates(row: EmployeeAttendanceLeaveEmployeeRow): string {
  const dates = row.leave_dates ?? [];
  if (!dates.length) return "—";
  return dates
    .map((d) => {
      const day = formatApiDateDisplay(String(d.leave_date ?? "").trim());
      const value = d.value;
      return value != null && Number(value) !== 1 ? `${day} (${value})` : day;
    })
    .filter(Boolean)
    .join(", ");
}

export function EmployeeAttendancePanel() {
  const defaults = useMemo(() => defaultAttendanceDateRange(), []);
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [emailFilter, setEmailFilter] = useState("");
  const [payload, setPayload] = useState<EmployeeAttendanceLeaveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const load = useCallback(async () => {
    const from = fromDate.trim();
    const to = toDate.trim();
    if (!from || !to) {
      setToast({ type: "error", message: "From date and to date are required." });
      return;
    }
    if (Date.parse(to) < Date.parse(from)) {
      setToast({ type: "error", message: "To date cannot be earlier than from date." });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const res = await hrmsService.getEmployeeAttendanceLeave({
        fromDate: from,
        toDate: to,
        page: 0,
        size: DEFAULT_PAGE_SIZE,
      });
      setPayload(res.data ?? null);
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load employee attendance.";
      setPayload(null);
      setToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const workingWeekdays = payload?.working_weekdays_in_range ?? 0;

  const filteredEmployees = useMemo(() => {
    const rows = payload?.employees ?? [];
    const q = emailFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const email = String(row.email ?? "").toLowerCase();
      const empId = String(row.emp_id ?? "").toLowerCase();
      return email.includes(q) || empId.includes(q);
    });
  }, [payload?.employees, emailFilter]);

  return (
    <section className="space-y-4">
      {toast ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800"
              : "border-rose-600/30 bg-rose-500/10 text-rose-800"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <h3 className="font-semibold">Employee attendance &amp; leave</h3>

        <div className="flex flex-wrap items-end gap-3">
          <DatePickerField
            label="From date"
            value={fromDate}
            onChange={setFromDate}
            className="w-[10.5rem] shrink-0"
          />
          <DatePickerField
            label="To date"
            value={toDate}
            onChange={setToDate}
            className="w-[10.5rem] shrink-0"
          />
          {payload ? (
            <div className="flex w-[10.5rem] shrink-0 flex-col gap-1 text-xs text-wt-text-muted">
              <span>Working days</span>
              <div
                className="input-field flex w-full items-center justify-center px-3 py-2 text-sm font-semibold tabular-nums"
                aria-live="polite"
              >
                {workingWeekdays}
              </div>
            </div>
          ) : null}
          <label className="sr-only" htmlFor="attendance-email-filter">
            Search
          </label>
          <input
            id="attendance-email-filter"
            type="search"
            className="input-field min-w-[200px] flex-1 px-3 py-2 text-sm"
            placeholder="Search…"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            aria-label="Search"
          />
          <button
            type="button"
            className="btn-primary px-3 py-2 text-sm h-10"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        {loading && !filteredEmployees.length ? (
          <p className="text-sm text-wt-text-muted">Loading attendance data…</p>
        ) : filteredEmployees.length ? (
          <div className="wt-scroll-both max-h-[min(70vh,560px)] rounded-xl border border-wt-border">
            <table className="min-w-full text-sm">
              <thead className="bg-wt-surface-2 text-wt-text-muted sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Employee ID</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Email</th>
                  <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Leave days</th>
                  <th className="text-left px-3 py-2 font-medium min-w-[160px]">Leave dates</th>
                  <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Attendance days</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((row) => (
                  <tr
                    key={String(row.user_id ?? row.email)}
                    className="border-t border-wt-border hover:bg-wt-surface-2/50"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{row.emp_id ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.email}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{row.leave_days_taken}</td>
                    <td className="px-3 py-2 max-w-[280px] text-xs">{formatLeaveDates(row)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{row.total_attendance_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-wt-text-muted">No employees found for this range.</p>
        )}
      </div>
    </section>
  );
}
