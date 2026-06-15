"use client";

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

const NAME_HEADER_CLASS = "px-3 py-2 text-left font-medium";
const NUMERIC_HEADER_CLASS =
  "px-3 py-2 text-center font-medium whitespace-nowrap tabular-nums";
const LEAVE_COLUMN_CLASS = `${NUMERIC_HEADER_CLASS} w-36`;
const ATTENDANCE_COLUMN_CLASS = `${NUMERIC_HEADER_CLASS} w-44`;
const STICKY_HEADER_CLASS =
  "sticky top-0 z-10 bg-wt-surface-2 text-wt-text-muted shadow-[inset_0_-1px_0_var(--wt-border)]";
const NAME_CELL_CLASS = "px-3 py-2 text-left truncate";
const NUMERIC_CELL_CLASS = "px-3 py-2 text-center tabular-nums whitespace-nowrap";
const LEAVE_CELL_CLASS = `${NUMERIC_CELL_CLASS} w-36`;
const ATTENDANCE_CELL_CLASS = `${NUMERIC_CELL_CLASS} w-44`;

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
      { root, rootMargin: "160px", threshold: 0 }
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
        <h3 className="font-semibold">Employee Attendance And Leave Summary</h3>

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

        {loading && !employees.length ? (
          <div
            className="flex min-h-[12rem] items-center justify-center rounded-xl border border-wt-border bg-wt-surface-2/30"
            aria-busy="true"
            aria-live="polite"
          >
            <span className="spinner-dark" role="status" aria-label="Loading attendance data" />
          </div>
        ) : employees.length ? (
          <div className="relative min-h-[12rem]">
            {loading ? (
              <div
                className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-wt-surface-1/80"
                aria-busy="true"
                aria-live="polite"
              >
                <span className="spinner-dark" role="status" aria-label="Loading attendance data" />
              </div>
            ) : null}
            <div
              ref={scrollRootRef}
              className="wt-scroll-both max-h-[min(70vh,560px)] overflow-auto rounded-xl border border-wt-border"
            >
              <table className="w-full min-w-full border-separate border-spacing-0 text-sm">
                <colgroup>
                  <col className="min-w-0" />
                  <col className="w-36" />
                  <col className="w-44" />
                </colgroup>
                <thead>
                  <tr>
                    <th className={`${STICKY_HEADER_CLASS} ${NAME_HEADER_CLASS}`}>Name</th>
                    <th className={`${STICKY_HEADER_CLASS} ${LEAVE_COLUMN_CLASS}`}>Leave days</th>
                    <th className={`${STICKY_HEADER_CLASS} ${ATTENDANCE_COLUMN_CLASS}`}>
                      Attendance days
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((row) => (
                    <tr
                      key={String(row.user_id ?? row.emp_id ?? row.name)}
                      className="border-t border-wt-border hover:bg-wt-surface-2/50"
                    >
                      <td className={NAME_CELL_CLASS} title={row.name?.trim() || undefined}>
                        {row.name?.trim() || "—"}
                      </td>
                      <td
                        className={`${LEAVE_CELL_CLASS} cursor-default`}
                        title={formatLeaveDatesHover(row)}
                      >
                        {row.leave_days_taken}
                      </td>
                      <td className={ATTENDANCE_CELL_CLASS}>{row.total_attendance_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={loadMoreRef} className="px-3 py-3 text-center text-xs text-wt-text-muted">
                {loadingMore ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="spinner-dark" role="status" aria-label="Loading more employees" />
                    <span>Loading more employees…</span>
                  </span>
                ) : allLoaded ? (
                  "All employees loaded"
                ) : null}
              </div>
            </div>
          </div>
        ) : !loading ? (
          <p className="text-sm text-wt-text-muted">No employees found for this range.</p>
        ) : null}
      </div>
    </section>
  );
}
