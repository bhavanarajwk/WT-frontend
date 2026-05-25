"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/src/api/error";
import {
  hrmsService,
  type EmployeeAttendanceLeaveData,
  type EmployeeAttendanceLeaveEmployeeRow,
} from "@/src/services/hrms.service";

type Toast = { type: "success" | "error"; message: string } | null;

const DEFAULT_PAGE_SIZE = 50;

function formatDateInputYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultAttendanceDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 4);
  return { from: formatDateInputYmd(from), to: formatDateInputYmd(to) };
}

function formatLeaveDates(row: EmployeeAttendanceLeaveEmployeeRow): string {
  const dates = row.leave_dates ?? [];
  if (!dates.length) return "—";
  return dates
    .map((d) => {
      const day = String(d.leave_date ?? "").trim();
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
  const totalElements = payload?.total_element ?? 0;

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
        <div>
          <h3 className="font-semibold mb-1">Employee attendance &amp; leave</h3>
          <p className="text-sm text-wt-text-muted">
            Weekday attendance and approved leave days per employee for the selected range.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
            From date
            <input
              type="date"
              className="input-field px-3 py-2 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
            To date
            <input
              type="date"
              className="input-field px-3 py-2 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <label className="text-xs text-wt-text-muted flex flex-col gap-1 min-w-[200px] flex-1">
            Filter by email or employee ID
            <input
              type="search"
              className="input-field px-3 py-2 text-sm"
              placeholder="Search…"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn-primary px-3 py-2 text-sm h-10"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>

        {payload ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-wt-border bg-wt-surface-2 px-4 py-3">
              <p className="text-xs text-wt-text-muted">Date range</p>
              <p className="text-sm font-medium mt-1">
                {payload.from_date} — {payload.to_date}
              </p>
            </div>
            <div className="rounded-xl border border-wt-border bg-wt-surface-2 px-4 py-3">
              <p className="text-xs text-wt-text-muted">Working weekdays in range</p>
              <p className="text-2xl font-semibold mt-1">{workingWeekdays}</p>
            </div>
            <div className="rounded-xl border border-wt-border bg-wt-surface-2 px-4 py-3">
              <p className="text-xs text-wt-text-muted">Employees (total)</p>
              <p className="text-2xl font-semibold mt-1">{totalElements}</p>
            </div>
          </div>
        ) : null}
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
