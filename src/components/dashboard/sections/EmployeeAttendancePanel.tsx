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
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/api/error";
import {
  hrmsService,
  type EmployeeAttendanceLeaveEmployeeRow,
} from "@/services/hrms.service";
import { DatePickerField } from "@/components/dashboard/ui/forms";
import { formatApiDate, formatApiDateDisplay } from "@/utils/apiDate";


type AttendanceSummary = {
  from_date: string;
  to_date: string;
  working_weekdays_in_range: number;
  total_element: number;
};

const PAGE_SIZE = 25;

type AttendanceUserTypeTab = "FULLTIME" | "INTERN";

const ATTENDANCE_USER_TYPE_TABS: { id: AttendanceUserTypeTab; label: string }[] = [
  { id: "FULLTIME", label: "Full-Time Employees" },
  { id: "INTERN", label: "Interns" },
];

const ATTENDANCE_USER_TYPE_LABEL: Record<AttendanceUserTypeTab, string> = {
  FULLTIME: "Full-Time Employees",
  INTERN: "Interns",
};

const EMAIL_HEADER_CLASS = "hidden sm:table-cell";
const LEAVE_COLUMN_CLASS = "text-center tabular-nums w-36";
const ATTENDANCE_COLUMN_CLASS = "text-center tabular-nums w-44";
const STICKY_HEADER_CLASS =
  "sticky top-0 z-10 bg-wt-surface-2 shadow-[inset_0_-1px_0_var(--wt-border)]";
const NAME_CELL_CLASS = "truncate";
const EMAIL_CELL_CLASS = "truncate hidden sm:table-cell";
const NUMERIC_CELL_CLASS = "text-center tabular-nums w-36";
const LEAVE_CELL_CLASS = NUMERIC_CELL_CLASS;
const ATTENDANCE_CELL_CLASS = "text-center tabular-nums w-44";

function defaultAttendanceDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(2026, 0, 1);
  return { from: formatApiDate(from), to: formatApiDate(to) };
}

function formatLeaveDatesHover(row: EmployeeAttendanceLeaveEmployeeRow): string {
  const dates = row.leave_dates ?? [];
  if (!dates.length) {
    return "No Leave Dates In This Range";
  }
  return dates
    .map((d) => formatApiDateDisplay(String(d.leave_date ?? "")).trim())
    .filter(Boolean)
    .join("\n");
}

export function EmployeeAttendancePanel() {
  const defaults = useMemo(() => defaultAttendanceDateRange(), []);
  const [userTypeTab, setUserTypeTab] = useState<AttendanceUserTypeTab>("FULLTIME");
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [employees, setEmployees] = useState<EmployeeAttendanceLeaveEmployeeRow[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingLockRef = useRef(false);
  const scrollOverflowRef = useRef(false);
  const filtersRef = useRef({
    from: defaults.from,
    to: defaults.to,
    search: "",
    userType: "FULLTIME" as AttendanceUserTypeTab,
  });

  const fetchNextPage = useCallback(async () => {
    if (loadingLockRef.current || !hasMoreRef.current) return;

    const from = filtersRef.current.from;
    const to = filtersRef.current.to;
    if (!from || !to) {
      showErrorToast("From Date And To Date Are Required.");
      return;
    }
    if (Date.parse(to) < Date.parse(from)) {
      showErrorToast("To Date Cannot Be Earlier Than From Date.");
      return;
    }

    const page = nextPageRef.current;
    const isFirstPage = page === 0;

    loadingLockRef.current = true;
    if (isFirstPage) {
      setLoading(true);
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
        type: filtersRef.current.userType,
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
            : "Failed To Load Employee Attendance.";
      if (isFirstPage) {
        setEmployees([]);
        setSummary(null);
      }
      showErrorToast(msg);
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
      userType: userTypeTab,
    };
    resetAndLoad();
  }, [fromDate, toDate, debouncedSearch, userTypeTab, resetAndLoad]);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root || loading) return;
    scrollOverflowRef.current = root.scrollHeight > root.clientHeight + 8;
  }, [employees.length, loading]);

  useEffect(() => {
    const root = scrollRootRef.current;
    const sentinel = loadMoreRef.current;
    if (!root || !sentinel || loading || loadingMore || !hasMoreRef.current) return;
    if (!scrollOverflowRef.current && employees.length > 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !loadingLockRef.current &&
          hasMoreRef.current &&
          !loading &&
          !loadingMore
        ) {
          void fetchNextPage();
        }
      },
      { root, rootMargin: "120px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, loading, loadingMore, employees.length]);


  const workingWeekdays = summary?.working_weekdays_in_range ?? 0;
  const totalItems = summary?.total_element ?? 0;
  const allLoaded = totalItems > 0 && employees.length >= totalItems;
  const audienceLabel = ATTENDANCE_USER_TYPE_LABEL[userTypeTab];

  return (
    <section className="space-y-4">
            <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <h3 className="font-semibold">Attendance</h3>

        <div
          className="flex flex-wrap gap-2 border-b border-wt-border pb-3"
          role="tablist"
          aria-label="Employee User Type"
        >
          {ATTENDANCE_USER_TYPE_TABS.map((tab) => {
            const isActive = userTypeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-wt-surface-3 text-wt-text"
                    : "text-wt-text-muted hover:bg-wt-surface-2"
                }`}
                onClick={() => setUserTypeTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <DatePickerField
            label="From Date"
            value={fromDate}
            onChange={setFromDate}
            className="w-[10.5rem] shrink-0"
          />
          <DatePickerField
            label="To Date"
            value={toDate}
            onChange={setToDate}
            className="w-[10.5rem] shrink-0"
          />
          {summary ? (
            <div className="flex w-[10.5rem] shrink-0 flex-col gap-1 text-xs text-wt-text-muted">
              <span>Working Days</span>
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
                · Showing {employees.length} of {totalItems} {audienceLabel}
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
            <span className="spinner-dark" role="status" aria-label="Loading Attendance Data" />
          </div>
        ) : employees.length ? (
          <div className="relative min-h-[12rem]">
            {loading ? (
              <div
                className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-wt-surface-1/80"
                aria-busy="true"
                aria-live="polite"
              >
                <span className="spinner-dark" role="status" aria-label="Loading Attendance Data" />
              </div>
            ) : null}
            <div
              ref={scrollRootRef}
              className="wt-scroll-both max-h-[min(70vh,560px)] overflow-auto rounded-xl border border-wt-border"
            >
              <WtTable className="min-w-full border-separate border-spacing-0">
                <colgroup>
                  <col className="min-w-0" />
                  <col className="min-w-[12rem]" />
                  <col className="w-36" />
                  <col className="w-44" />
                </colgroup>
                <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={STICKY_HEADER_CLASS}>Name</TableHead>
                    <TableHead className={`${STICKY_HEADER_CLASS} ${EMAIL_HEADER_CLASS}`}>Email</TableHead>
                    <TableHead className={`${STICKY_HEADER_CLASS} ${LEAVE_COLUMN_CLASS}`}>Leave Days</TableHead>
                    <TableHead className={`${STICKY_HEADER_CLASS} ${ATTENDANCE_COLUMN_CLASS}`}>
                      Attendance Days
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((row) => (
                    <TableRow
                      key={String(row.user_id ?? row.emp_id ?? row.name)}
                      className="hover:bg-muted/50"
                    >
                      <TableCell className={NAME_CELL_CLASS} title={row.name?.trim() || undefined}>
                        {row.name?.trim() || "—"}
                      </TableCell>
                      <TableCell className={EMAIL_CELL_CLASS} title={row.email?.trim() || undefined}>
                        {row.email?.trim() || "—"}
                      </TableCell>
                      <TableCell
                        className={`${LEAVE_CELL_CLASS} cursor-default`}
                        title={formatLeaveDatesHover(row)}
                      >
                        {row.leave_days_taken}
                      </TableCell>
                      <TableCell className={ATTENDANCE_CELL_CLASS}>{row.total_attendance_days}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </WtTable>
              <div ref={loadMoreRef} className="px-3 py-3 text-center text-xs text-wt-text-muted">
                {loadingMore ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="spinner-dark" role="status" aria-label="Loading More Employees" />
                    <span>Loading More Employees…</span>
                  </span>
                ) : allLoaded ? (
                  `All ${audienceLabel} Loaded`
                ) : null}
              </div>
            </div>
          </div>
        ) : !loading ? (
          <p className="text-sm text-wt-text-muted">
            No {audienceLabel} Found For This Range.
          </p>
        ) : null}
      </div>
    </section>
  );
}
