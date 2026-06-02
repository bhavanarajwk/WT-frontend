"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/error";
import {
  hrmsService,
  type EmployeeAttendanceLeaveData,
  type EmployeeAttendanceLeaveEmployeeRow,
} from "@/services/hrms.service";
import { DatePickerField } from "@/components/dashboard/ui/forms";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { formatApiDate, formatApiDateDisplay } from "@/utils/apiDate";

type Toast = { type: "success" | "error"; message: string } | null;

const DEFAULT_PAGE_SIZE = 10;

function defaultAttendanceDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(2026, 0, 1);
  return { from: formatApiDate(from), to: formatApiDate(to) };
}

function formatLeaveDatesHover(row: EmployeeAttendanceLeaveEmployeeRow): string {
  const dates = row.leave_dates ?? [];
  if (!dates.length) {
    return "No leave dates in this range";
  }
  return dates
    .map((d) => formatApiDateDisplay(String(d.leave_date ?? "")).trim())
    .filter(Boolean)
    .join("\n");
}

export function EmployeeAttendancePanel() {
  const defaults = useMemo(() => defaultAttendanceDateRange(), []);
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(0);
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
        page,
        size: DEFAULT_PAGE_SIZE,
        search: appliedSearch.trim() || undefined,
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
  }, [fromDate, toDate, page, appliedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const workingWeekdays = payload?.working_weekdays_in_range ?? 0;
  const employees = payload?.employees ?? [];
  const totalPages = Math.max(1, payload?.total_page ?? 1);
  const totalItems = payload?.total_element ?? 0;
  const currentPage = payload?.current_page ?? page;
  const rangeStart = totalItems === 0 ? 0 : currentPage * DEFAULT_PAGE_SIZE + 1;
  const rangeEnd = Math.min(totalItems, (currentPage + 1) * DEFAULT_PAGE_SIZE);

  function applyFilters() {
    setPage(0);
    setAppliedSearch(searchInput.trim());
  }

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
          <label className="sr-only" htmlFor="attendance-search">
            Search
          </label>
          <input
            id="attendance-search"
            type="search"
            className="input-field min-w-[200px] flex-1 px-3 py-2 text-sm"
            placeholder="Search by name, emp id, or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            aria-label="Search employees"
          />
          <button
            type="button"
            className="btn-primary px-3 py-2 text-sm h-10"
            onClick={applyFilters}
            disabled={loading}
          >
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>
        {payload ? (
          <p className="text-xs text-wt-text-muted">
            Range {formatApiDateDisplay(payload.from_date)} – {formatApiDateDisplay(payload.to_date)}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        {loading && !employees.length ? (
          <p className="text-sm text-wt-text-muted">Loading attendance data…</p>
        ) : employees.length ? (
          <>
            <div className="mx-auto max-w-4xl">
              <div className="wt-scroll-both max-h-[min(70vh,560px)] rounded-xl border border-wt-border">
                <table className="w-full text-sm">
                <thead className="bg-wt-surface-2 text-wt-text-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Name</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Leave days</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Attendance days</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((row) => (
                    <tr
                      key={String(row.user_id ?? row.emp_id ?? row.name)}
                      className="border-t border-wt-border hover:bg-wt-surface-2/50"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">{row.name?.trim() || "—"}</td>
                      <td
                        className="px-3 py-2 text-right whitespace-nowrap cursor-default"
                        title={formatLeaveDatesHover(row)}
                      >
                        {row.leave_days_taken}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{row.total_attendance_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ListPagination
              className="mt-3"
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              pageSize={DEFAULT_PAGE_SIZE}
              onPageChange={setPage}
            />
            </div>
          </>
        ) : (
          <p className="text-sm text-wt-text-muted">No employees found for this range.</p>
        )}
      </div>
    </section>
  );
}
