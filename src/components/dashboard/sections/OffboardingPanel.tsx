"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import type { OffboardListItem } from "@/types/offboard";
import { DatePickerField, InputField, SelectField, TextAreaField } from "@/components/dashboard/ui/forms";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
import { toPagedRows } from "@/utils/apiRows";
import { formatApiDateDisplay } from "@/utils/apiDate";
import {
  CONSULTANT_EXIT_TYPE,
  createEmptyOffboardingForm,
  EXIT_TYPE_SELECT_OPTIONS,
  type ExitType,
} from "@/utils/offboardingFormState";

type Toast = { type: "success" | "error"; message: string } | null;

type OffboardCandidate = {
  emp_id: string;
  name: string;
  email: string;
  user_type: string;
};

const DEFAULT_PAGE_SIZE = 10;

const USER_TYPE_FILTER_OPTIONS = ["", "FULLTIME", "INTERN", "CONSULTANT"] as const;

const STICKY_HEADER_CLASS =
  "sticky top-0 z-10 bg-wt-surface-2 text-wt-text-muted shadow-[inset_0_-1px_0_var(--wt-border)]";

const INNER_SCROLL_CLASS =
  "max-h-[min(70vh,560px)] overflow-auto overscroll-behavior-auto rounded-xl border border-wt-border";

function defaultFinancialYearStart(): string {
  const now = new Date();
  const year = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return String(year);
}

function financialYearOptions(): string[] {
  return Array.from({ length: Math.max(new Date().getFullYear() - 2019 + 1, 1) }, (_, idx) =>
    String(2019 + idx)
  );
}

function formatPercent(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n}%`;
}

function exitSplitPercent(part: unknown, total: unknown): number {
  const p = Number(part);
  const t = Number(total);
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return 0;
  return Math.round((p / t) * 1000) / 10;
}

function formatBool(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatExitType(value: string): string {
  const v = String(value ?? "").trim().toUpperCase();
  const hit = EXIT_TYPE_SELECT_OPTIONS.find((opt) => opt.value === v);
  if (hit) return hit.label;
  return v || "—";
}

function OffboardingLoader({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[12rem] items-center justify-center rounded-xl border border-wt-border bg-wt-surface-2/30"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="spinner-dark" role="status" aria-label={label} />
    </div>
  );
}

function OffboardingLoaderOverlay({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-wt-surface-1/80"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="spinner-dark" role="status" aria-label={label} />
    </div>
  );
}

export function OffboardingPanel() {
  const [offboardingForm, setOffboardingForm] = useState(createEmptyOffboardingForm);
  const [offboardCandidates, setOffboardCandidates] = useState<OffboardCandidate[]>([]);
  const [offboardedRows, setOffboardedRows] = useState<OffboardListItem[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(0);
  const [listPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterType, setFilterType] = useState("");

  const [fyStartYear, setFyStartYear] = useState(defaultFinancialYearStart);
  const [attritionPercent, setAttritionPercent] = useState<number | null>(null);
  const [voluntaryPercent, setVoluntaryPercent] = useState<number | null>(null);
  const [involuntaryPercent, setInvoluntaryPercent] = useState<number | null>(null);
  const [attritionExitCount, setAttritionExitCount] = useState<number | null>(null);
  const [loadingAttrition, setLoadingAttrition] = useState(false);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const loadAttritionSummary = useCallback(async () => {
    const parsedFy = Number.parseInt(fyStartYear, 10);
    const fy_start_year =
      Number.isFinite(parsedFy) && parsedFy >= 2000 && parsedFy <= 2100
        ? parsedFy
        : Number(defaultFinancialYearStart());
    setLoadingAttrition(true);
    try {
      const [overallRes, viRes] = await Promise.all([
        hrmsService.getAttritionOverallPercent({ fy_start_year }),
        hrmsService.getAttritionVoluntaryInvoluntary({ fy_start_year }),
      ]);
      const overall = ((overallRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
      const vi = ((viRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
      const voluntaryCount = Number(vi.voluntary_count ?? 0);
      const involuntaryCount = Number(vi.involuntary_count ?? 0);
      const totalCount = Number(vi.total_count ?? voluntaryCount + involuntaryCount);
      setAttritionPercent(Number(overall.attrition_percent ?? 0));
      setAttritionExitCount(Number(overall.number_of_exits ?? totalCount));
      setVoluntaryPercent(exitSplitPercent(voluntaryCount, totalCount));
      setInvoluntaryPercent(exitSplitPercent(involuntaryCount, totalCount));
    } catch {
      setAttritionPercent(null);
      setVoluntaryPercent(null);
      setInvoluntaryPercent(null);
      setAttritionExitCount(null);
    } finally {
      setLoadingAttrition(false);
    }
  }, [fyStartYear]);

  const loadOffboardList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await hrmsService.getOffboardList({
        page: listPage,
        size: listPageSize,
        search: debouncedSearch.trim() || undefined,
        type: filterType.trim() || undefined,
        fromDate: filterFromDate.trim() || undefined,
        toDate: filterToDate.trim() || undefined,
      });
      const data = res.data;
      setOffboardedRows(data?.items ?? []);
      setListTotal(data?.total ?? 0);
    } catch (error) {
      setOffboardedRows([]);
      setListTotal(0);
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load offboarded employees.";
      setToast({ type: "error", message: msg });
    } finally {
      setLoadingList(false);
    }
  }, [listPage, listPageSize, debouncedSearch, filterType, filterFromDate, filterToDate]);

  const loadOffboardCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const [onboardRes, offboardRes] = await Promise.all([
        hrmsService.getOnboardList({ page: "0", size: "500", onboardingStatus: "ACTIVE" }),
        hrmsService.getOffboardList({ page: 0, size: 200 }).catch(() => ({
          data: { items: [] as OffboardListItem[], total: 0, page: 0, size: 0 },
        })),
      ]);
      const onboardRows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
      const offboardedIds = new Set(
        (offboardRes.data?.items ?? []).map((row) => String(row.emp_id ?? "").trim().toLowerCase())
      );
      const candidates = Array.from(
        new Map(
          onboardRows
            .map((row) => {
              const emp_id = String(row.emp_id ?? row.empId ?? "").trim();
              if (!emp_id || offboardedIds.has(emp_id.toLowerCase())) return null;
              const status = String(row.status ?? "").trim().toUpperCase();
              if (status !== "ACTIVE") return null;
              const name = String(row.name ?? "—").trim() || "—";
              const email = String(row.email ?? "—").trim() || "—";
              const user_type = String(row.user_type ?? row.userType ?? "").trim().toUpperCase();
              return [emp_id.toLowerCase(), { emp_id, name, email, user_type }] as const;
            })
            .filter((entry): entry is readonly [string, OffboardCandidate] => Boolean(entry))
        ).values()
      ).sort((a, b) => a.emp_id.localeCompare(b.emp_id));
      setOffboardCandidates(candidates);
    } catch {
      setOffboardCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    void loadOffboardCandidates();
  }, [loadOffboardCandidates]);

  useEffect(() => {
    void loadOffboardList();
  }, [loadOffboardList]);

  useEffect(() => {
    void loadAttritionSummary();
  }, [loadAttritionSummary]);

  useEffect(() => {
    setListPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const totalPages = Math.max(1, Math.ceil(listTotal / listPageSize) || 1);
  const rangeStart = listTotal === 0 ? 0 : listPage * listPageSize + 1;
  const rangeEnd = Math.min(listTotal, (listPage + 1) * listPageSize);

  const selectedCandidate = useMemo(
    () => offboardCandidates.find((emp) => emp.emp_id === offboardingForm.emp_id),
    [offboardCandidates, offboardingForm.emp_id]
  );

  const isInternOffboarding = selectedCandidate?.user_type === "INTERN";
  const isConsultantOffboarding = selectedCandidate?.user_type === "CONSULTANT";
  const showExitTypeField = !isConsultantOffboarding;

  const candidateOptions = useMemo(
    () =>
      offboardCandidates.map((emp) => ({
        value: emp.emp_id,
        label: `${emp.emp_id} — ${emp.name} (${emp.email})`,
      })),
    [offboardCandidates]
  );

  const canSubmitOffboarding = useMemo(() => {
    if (!offboardingForm.emp_id.trim()) return false;
    const exitType = isConsultantOffboarding
      ? CONSULTANT_EXIT_TYPE
      : offboardingForm.exit_type;
    if (!exitType) return false;
    if (isInternOffboarding) {
      const lwd = offboardingForm.last_working_day.trim();
      return Boolean(lwd && offboardingForm.resignation_date.trim() === lwd);
    }
    return Boolean(offboardingForm.resignation_date.trim());
  }, [offboardingForm, isInternOffboarding, isConsultantOffboarding]);

  const offboardingNoticeLabel = useMemo(() => {
    const r = offboardingForm.resignation_date.trim();
    const l = offboardingForm.last_working_day.trim();
    if (isInternOffboarding && l) {
      return "Intern offboarding uses a single exit date for resignation and last working day.";
    }
    if (isConsultantOffboarding) {
      return "Consultant offboarding is recorded as a Contractual exit and is excluded from attrition metrics.";
    }
    if (!r || !l) return null;
    const a = new Date(r);
    const b = new Date(l);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) {
      return "Resignation date must be on or before last working day.";
    }
    const days = Math.round((b.getTime() - a.getTime()) / 86400000);
    return `Notice period (resignation → last working day): ${Math.max(0, days)} calendar day(s).`;
  }, [offboardingForm.resignation_date, offboardingForm.last_working_day, isInternOffboarding, isConsultantOffboarding]);

  function resolveExitTypeForSubmit(): ExitType {
    if (isConsultantOffboarding) return CONSULTANT_EXIT_TYPE;
    return offboardingForm.exit_type as ExitType;
  }

  function handleEmployeeChange(emp_id: string) {
    const candidate = offboardCandidates.find((emp) => emp.emp_id === emp_id);
    const isIntern = candidate?.user_type === "INTERN";
    const isConsultant = candidate?.user_type === "CONSULTANT";
    setOffboardingForm((prev) => {
      const next = {
        ...prev,
        emp_id,
        exit_type: (isConsultant ? CONSULTANT_EXIT_TYPE : "") as "" | ExitType,
      };
      if (isIntern && prev.last_working_day.trim()) {
        next.resignation_date = prev.last_working_day;
      } else if (isIntern) {
        next.resignation_date = "";
      }
      return next;
    });
  }

  function handleLastWorkingDayChange(value: string) {
    setOffboardingForm((prev) => ({
      ...prev,
      last_working_day: value,
      ...(isInternOffboarding ? { resignation_date: value } : {}),
    }));
  }

  async function submitOffboarding() {
    if (!canSubmitOffboarding) return;

    const empIdValue = offboardingForm.emp_id.trim();
    const resignationDate = offboardingForm.resignation_date.trim();
    const lastWorkingDay = offboardingForm.last_working_day.trim();

    setSubmitting(true);
    setToast(null);
    try {
      await hrmsService.offboardEmployee(empIdValue, {
        resignation_date: resignationDate,
        exit_type: resolveExitTypeForSubmit(),
        last_working_day: lastWorkingDay || undefined,
        reason: offboardingForm.reason.trim() || null,
        critical_skill: offboardingForm.critical_skill.trim() || null,
        is_regretted: offboardingForm.is_regretted,
      });
      setOffboardingForm(createEmptyOffboardingForm());
      setListPage(0);
      setToast({ type: "success", message: "Employee offboarded successfully." });
      await loadOffboardCandidates();
      const res = await hrmsService.getOffboardList({
        page: 0,
        size: listPageSize,
        search: debouncedSearch.trim() || undefined,
        type: filterType.trim() || undefined,
        fromDate: filterFromDate.trim() || undefined,
        toDate: filterToDate.trim() || undefined,
      });
      setOffboardedRows(res.data?.items ?? []);
      setListTotal(res.data?.total ?? 0);
      await loadAttritionSummary();
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to submit offboarding.";
      setToast({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-col gap-4">
      {toast ? (
        <div
          className={`sticky top-0 z-30 rounded-xl border px-4 py-3 text-sm shadow-sm ${
            toast.type === "success"
              ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800"
              : "border-rose-600/30 bg-rose-500/10 text-rose-800"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}

      <div className="relative rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        {loadingAttrition ? <OffboardingLoaderOverlay label="Loading Attrition Summary" /> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-semibold">Attrition Summary</h3>
            <p className="text-xs text-wt-text-muted mt-1">
              Financial-year exit metrics (Apr–Mar)
              {attritionExitCount != null ? ` · ${attritionExitCount} exit(s)` : ""}
            </p>
          </div>
          <SelectField
            label="Financial Year (Start)"
            className="min-w-[10rem]"
            value={fyStartYear}
            onChange={setFyStartYear}
            options={financialYearOptions().map((year) => ({
              value: year,
              label: `FY ${year}–${String(Number(year) + 1).slice(-2)}`,
            }))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-wt-border bg-wt-surface-2/60 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
              Attrition %
            </p>
            <p className="text-2xl font-semibold mt-2 tabular-nums text-rose-700">
              {loadingAttrition ? "…" : formatPercent(attritionPercent)}
            </p>
          </article>
          <article className="rounded-xl border border-wt-border bg-wt-surface-2/60 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
              Voluntary %
            </p>
            <p className="text-2xl font-semibold mt-2 tabular-nums text-sky-700">
              {loadingAttrition ? "…" : formatPercent(voluntaryPercent)}
            </p>
            <p className="text-xs text-wt-text-muted mt-1">Share of FY exits</p>
          </article>
          <article className="rounded-xl border border-wt-border bg-wt-surface-2/60 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
              Involuntary %
            </p>
            <p className="text-2xl font-semibold mt-2 tabular-nums text-amber-700">
              {loadingAttrition ? "…" : formatPercent(involuntaryPercent)}
            </p>
            <p className="text-xs text-wt-text-muted mt-1">Share of FY exits</p>
          </article>
        </div>
      </div>

      <div className="relative rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        {submitting || loadingCandidates ? (
          <OffboardingLoaderOverlay
            label={submitting ? "Submitting Offboarding" : "Loading Employees"}
          />
        ) : null}
        <h3 className="font-semibold mb-4">Employee Offboarding</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <SelectField
            label="Employee"
            required
            disabled={loadingCandidates || submitting}
            placeholder={
              loadingCandidates
                ? "Loading Employees…"
                : candidateOptions.length
                  ? "Select Employee"
                  : "No Active Employees Available"
            }
            value={offboardingForm.emp_id}
            onChange={handleEmployeeChange}
            options={candidateOptions}
          />
          {isInternOffboarding ? (
            <InputField
              label="Last Working Day"
              required
              type="date"
              value={offboardingForm.last_working_day}
              onChange={handleLastWorkingDayChange}
              disabled={submitting}
            />
          ) : (
            <>
              <InputField
                label="Resignation Date"
                required
                type="date"
                value={offboardingForm.resignation_date}
                onChange={(v) => setOffboardingForm((p) => ({ ...p, resignation_date: v }))}
                disabled={submitting}
              />
              <InputField
                label="Last Working Day"
                type="date"
                value={offboardingForm.last_working_day}
                onChange={handleLastWorkingDayChange}
                disabled={submitting}
              />
            </>
          )}
          {showExitTypeField ? (
            <SelectField
              label="Exit Type"
              required
              placeholder="Select Exit Type"
              value={offboardingForm.exit_type}
              options={EXIT_TYPE_SELECT_OPTIONS}
              onChange={(v) =>
                setOffboardingForm((p) => ({
                  ...p,
                  exit_type:
                    v === "INVOLUNTARY" || v === "VOLUNTARY" || v === "CONTRACTUAL"
                      ? (v as ExitType)
                      : "",
                }))
              }
              disabled={submitting}
            />
          ) : null}
          <TextAreaField
            className="md:col-span-2"
            label="Reason"
            rows={5}
            value={offboardingForm.reason}
            onChange={(v) => setOffboardingForm((p) => ({ ...p, reason: v }))}
            placeholder="Enter a detailed reason for offboarding"
          />
          <TextAreaField
            className="md:col-span-2"
            label="Critical Skill"
            rows={5}
            value={offboardingForm.critical_skill}
            onChange={(v) => setOffboardingForm((p) => ({ ...p, critical_skill: v }))}
            placeholder="Describe critical skills impacted by this exit"
          />
          <label className="text-xs text-wt-text-muted flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={offboardingForm.is_regretted}
              disabled={submitting}
              onChange={(e) =>
                setOffboardingForm((p) => ({ ...p, is_regretted: e.target.checked }))
              }
            />
            Is Regretted
          </label>
        </div>
        {offboardingNoticeLabel ? (
          <p className="text-sm text-wt-text-muted mt-2">{offboardingNoticeLabel}</p>
        ) : null}
        <div className="mt-4">
          <button
            type="button"
            className="btn-primary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSubmitOffboarding || submitting || loadingCandidates}
            onClick={() => void submitOffboarding()}
          >
            {submitting ? "Submitting…" : "Submit Offboarding"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4 min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Offboarded Employees</h3>
          <p className="text-xs text-wt-text-muted tabular-nums">
            {loadingList ? "Loading…" : `${listTotal} total`}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="sr-only" htmlFor="offboard-list-search">
            Search
          </label>
          <input
            id="offboard-list-search"
            type="search"
            className="input-field min-w-[200px] flex-1 px-3 py-2 text-sm"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search"
            disabled={loadingList}
          />
          <DatePickerField
            label="LWD From"
            value={filterFromDate}
            onChange={(v) => {
              setFilterFromDate(v);
              setListPage(0);
            }}
            className="w-[10.5rem] shrink-0"
          />
          <DatePickerField
            label="LWD To"
            value={filterToDate}
            onChange={(v) => {
              setFilterToDate(v);
              setListPage(0);
            }}
            className="w-[10.5rem] shrink-0"
          />
          <SelectField
            label="User Type"
            className="w-[10.5rem] shrink-0"
            value={filterType}
            onChange={(v) => {
              setFilterType(v);
              setListPage(0);
            }}
            placeholder="All types"
            options={[
              { value: "", label: "All types" },
              ...USER_TYPE_FILTER_OPTIONS.filter(Boolean).map((t) => ({
                value: t,
                label: t,
              })),
            ]}
          />
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-sm h-10 border border-wt-border rounded-lg"
            onClick={() => void loadOffboardList()}
            disabled={loadingList}
          >
            Refresh
          </button>
        </div>

        {loadingList && !offboardedRows.length ? (
          <OffboardingLoader label="Loading Offboarded Employees" />
        ) : offboardedRows.length ? (
          <>
            <div className="relative min-h-[12rem]">
              {loadingList ? <OffboardingLoaderOverlay label="Loading Offboarded Employees" /> : null}
              <div className={INNER_SCROLL_CLASS}>
                <table className="w-full min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className={`${STICKY_HEADER_CLASS} text-left px-3 py-2 font-medium whitespace-nowrap`}>
                        Name
                      </th>
                      <th className={`${STICKY_HEADER_CLASS} text-left px-3 py-2 font-medium whitespace-nowrap`}>
                        Status
                      </th>
                      <th className={`${STICKY_HEADER_CLASS} text-left px-3 py-2 font-medium whitespace-nowrap`}>
                        Exit Type
                      </th>
                      <th className={`${STICKY_HEADER_CLASS} text-left px-3 py-2 font-medium whitespace-nowrap`}>
                        Resignation
                      </th>
                      <th className={`${STICKY_HEADER_CLASS} text-left px-3 py-2 font-medium whitespace-nowrap`}>
                        Last Working Day
                      </th>
                      <th className={`${STICKY_HEADER_CLASS} text-right px-3 py-2 font-medium whitespace-nowrap`}>
                        Notice (days)
                      </th>
                      <th className={`${STICKY_HEADER_CLASS} text-left px-3 py-2 font-medium whitespace-nowrap`}>
                        Designation
                      </th>
                      <th className={`${STICKY_HEADER_CLASS} text-left px-3 py-2 font-medium whitespace-nowrap`}>
                        Band
                      </th>
                      <th className={`${STICKY_HEADER_CLASS} text-left px-3 py-2 font-medium whitespace-nowrap`}>
                        Regretted
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {offboardedRows.map((row) => (
                      <tr
                        key={row.emp_id}
                        className="border-t border-wt-border hover:bg-wt-surface-2/50"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{row.employee_name || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EmployeeStatusBadge status={row.status} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatExitType(row.exit_type)}</td>
                        <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                          {formatApiDateDisplay(row.resignation_date) || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                          {formatApiDateDisplay(row.last_working_day) || "—"}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                          {row.notice_period_days ?? "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                          {row.designation ?? "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap max-w-[160px] truncate">
                          {row.band_name ?? "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatBool(row.is_regretted)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <ListPagination
              page={listPage}
              totalPages={totalPages}
              totalItems={listTotal}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              pageSize={listPageSize}
              onPageChange={setListPage}
            />
          </>
        ) : (
          <p className="text-sm text-wt-text-muted">No Offboarded Employees Found.</p>
        )}
      </div>
    </section>
  );
}
