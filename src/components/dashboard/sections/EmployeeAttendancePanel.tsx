"use client";

import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/api/error";
import {
  hrmsService,
  type EmployeeAttendanceLeaveEmployeeRow,
} from "@/services/hrms.service";
import { DatePickerField } from "@/components/dashboard/ui/forms";
import { formatApiDate, formatApiDateDisplay } from "@/utils/apiDate";

type Toast = { type: "success" | "error"; message: string } | null;

type AttendanceSummary = {
  from_date: string;
  to_date: string;
  working_weekdays_in_range: number;
  total_element: number;
};

const PAGE_SIZE = 25;

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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [employees, setEmployees] = useState<EmployeeAttendanceLeaveEmployeeRow[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const scrollRootRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingLockRef = useRef(false);
  const filtersRef = useRef({ from: defaults.from, to: defaults.to, search: "" });

  const fetchNextPage = useCallback(async () => {
    if (loadingLockRef.current || !hasMoreRef.current) return;

    const from = filtersRef.current.from;
    const to = filtersRef.current.to;
    if (!from || !to) {
      setToast({ type: "error", message: "From date and to date are required." });
      return;
    }
    if (Date.parse(to) < Date.parse(from)) {
      setToast({ type: "error", message: "To date cannot be earlier than from date." });
      return;
    }

    const page = nextPageRef.current;
    const isFirstPage = page === 0;

    loadingLockRef.current = true;
    if (isFirstPage) {
      setLoading(true);
      setToast(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await hrmsService.getEmployeeAttendanceLeave({
        fromDate: from,
        toDate: to,
        page,
        size: PAGE_SIZE,
        search: filtersRef.current.search || undefined,
      });
      const data = res.data;
      const rows = data?.employees ?? [];

      setSummary(
        data
          ? {
              from_date: data.from_date,
              to_date: data.to_date,
              working_weekdays_in_range: data.working_weekdays_in_range,
              total_element: data.total_element,
            }
          : null
      );

      setEmployees((prev) => (isFirstPage ? rows : [...prev, ...rows]));

      const totalPages = Math.max(1, data?.total_page ?? 1);
      const currentPage = data?.current_page ?? page;
      hasMoreRef.current = currentPage + 1 < totalPages;
      nextPageRef.current = page + 1;
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load employee attendance.";
      if (isFirstPage) {
        setEmployees([]);
        setSummary(null);
      }
      setToast({ type: "error", message: msg });
      hasMoreRef.current = false;
    } finally {
      loadingLockRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const resetAndLoad = useCallback(() => {
    nextPageRef.current = 0;
    hasMoreRef.current = true;
    setEmployees([]);
    setSummary(null);
    void fetchNextPage();
  }, [fetchNextPage]);

  useEffect(() => {
    filtersRef.current = {
      from: fromDate.trim(),
      to: toDate.trim(),
      search: debouncedSearch.trim(),
    };
    resetAndLoad();
  }, [fromDate, toDate, debouncedSearch, resetAndLoad]);

  useEffect(() => {
    const root = scrollRootRef.current;
    const sentinel = loadMoreRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { root, rootMargin: "120px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, employees.length, loading, loadingMore]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const workingWeekdays = summary?.working_weekdays_in_range ?? 0;
  const totalItems = summary?.total_element ?? 0;
  const allLoaded = totalItems > 0 && employees.length >= totalItems;

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
        <h3 className="font-semibold">Employee Attendance & Leave</h3>

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
          {summary ? (
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
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search"
          />
        </div>
        {summary ? (
          <p className="text-xs text-wt-text-muted">
            Range {formatApiDateDisplay(summary.from_date)} – {formatApiDateDisplay(summary.to_date)}
            {totalItems > 0 ? (
              <>
                {" "}
                · Showing {employees.length} of {totalItems} employees
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        {loading && !employees.length ? (
          <SectionLoading label="Loading attendance data…" />
        ) : employees.length ? (
          <div className="mx-auto max-w-4xl">
            <div
              ref={scrollRootRef}
              className="wt-scroll-both max-h-[min(70vh,560px)] overflow-y-auto rounded-xl border border-wt-border"
            >
              <table className="w-full text-sm">
                <thead className="wt-table-sticky-head text-wt-text-muted">
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
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {row.total_attendance_days}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={loadMoreRef} className="px-3 py-3 text-center text-xs text-wt-text-muted">
                {loadingMore ? "Loading more employees…" : allLoaded ? "All employees loaded" : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-wt-text-muted">No employees found for this range.</p>
        )}
      </div>
    </section>
  );
}
