"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import type { OffboardListItem } from "@/types/offboard";
import {
  DatePickerField,
  DropdownSelectField,
  TextAreaField,
} from "@/components/dashboard/ui/forms";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
import { BlackLoader, LoadingOverlay, LoadingPanel } from "@/components/dashboard/shared/BlackLoader";
import { toPagedRows } from "@/utils/apiRows";
import { formatApiDateDisplay } from "@/utils/apiDate";
import {
  createEmptyOffboardingForm,
  EXIT_TYPE_OPTIONS,
  formatExitTypeLabel,
  formatUserTypeLabel,
  isOffboardingFormValid,
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
const STICKY_HEADER_CLASS =
  "sticky top-0 z-10 bg-wt-surface-2 text-wt-text-muted border-b border-wt-border";

const USER_TYPE_FILTER_OPTIONS = ["", "FULLTIME", "INTERN", "CONSULTANT"] as const;

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

  const selectedCandidate = useMemo(
    () => offboardCandidates.find((row) => row.emp_id === offboardingForm.emp_id) ?? null,
    [offboardCandidates, offboardingForm.emp_id]
  );
  const selectedUserType = selectedCandidate?.user_type ?? "";
  const isIntern = selectedUserType.toUpperCase() === "INTERN";
  const isConsultant = selectedUserType.toUpperCase() === "CONSULTANT";

  const canSubmit = isOffboardingFormValid(offboardingForm, selectedUserType);

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
      const onboardRes = await hrmsService.getOnboardList({
        page: "0",
        size: "500",
        onboardingStatus: "ACTIVE",
      });
      const onboardRows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);

      let offboardedIds = new Set<string>();
      try {
        const offboardRes = await hrmsService.getOffboardList({ page: 0, size: 500 });
        offboardedIds = new Set(
          (offboardRes.data?.items ?? []).map((row) => String(row.emp_id ?? "").trim().toLowerCase())
        );
      } catch {
        offboardedIds = new Set();
      }

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
      setToast({ type: "error", message: "Failed to load active employees for offboarding." });
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
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const totalPages = Math.max(1, Math.ceil(listTotal / listPageSize) || 1);
  const rangeStart = listTotal === 0 ? 0 : listPage * listPageSize + 1;
  const rangeEnd = Math.min(listTotal, (listPage + 1) * listPageSize);

  const candidateOptions = useMemo(
    () =>
      offboardCandidates.map((emp) => ({
        value: emp.emp_id,
        label: `${emp.emp_id} — ${emp.name} (${emp.email})`,
      })),
    [offboardCandidates]
  );

  const offboardingNoticeLabel = useMemo(() => {
    const r = offboardingForm.resignation_date.trim();
    const l = offboardingForm.last_working_day.trim();
    if (!r || !l) return null;
    const a = new Date(r);
    const b = new Date(l);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) {
      return "Resignation Date must be on or before Last Working Day.";
    }
    const days = Math.round((b.getTime() - a.getTime()) / 86400000);
    return `Notice Period (Resignation → Last Working Day): ${Math.max(0, days)} Calendar Day(s).`;
  }, [offboardingForm.resignation_date, offboardingForm.last_working_day]);

  function handleEmployeeChange(empId: string) {
    const next = offboardCandidates.find((row) => row.emp_id === empId);
    setOffboardingForm((prev) => ({
      ...prev,
      emp_id: empId,
      exit_type: next?.user_type.toUpperCase() === "CONSULTANT" ? "CONTRACTUAL" : "",
      resignation_date: "",
      last_working_day: "",
    }));
  }

  function handleLastWorkingDayChange(value: string) {
    setOffboardingForm((prev) => {
      if (isIntern) {
        return { ...prev, last_working_day: value, resignation_date: value };
      }
      return { ...prev, last_working_day: value };
    });
  }

  async function submitOffboarding() {
    if (!canSubmit) return;
    const empIdValue = offboardingForm.emp_id.trim();
    const resignationDate = offboardingForm.resignation_date.trim();
    const lastWorkingDay = offboardingForm.last_working_day.trim();
    const exitType: ExitType = isConsultant
      ? "CONTRACTUAL"
      : (offboardingForm.exit_type as ExitType);

    setSubmitting(true);
    setToast(null);
    try {
      await hrmsService.offboardEmployee(empIdValue, {
        resignation_date: resignationDate,
        exit_type: exitType,
        last_working_day: lastWorkingDay || undefined,
        reason: offboardingForm.reason.trim() || null,
        expected_behavior: offboardingForm.expected_behavior.trim() || null,
        critical_skill: offboardingForm.critical_skill.trim() || null,
        is_regretted: offboardingForm.is_regretted,
      });
      setOffboardingForm(createEmptyOffboardingForm());
      setListPage(0);
      setToast({ type: "success", message: "Employee offboarded successfully." });
      await loadOffboardCandidates();
      await loadOffboardList();
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
    <section className="relative space-y-4">
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
        {loadingAttrition ? <LoadingOverlay label="Loading Attrition Summary" /> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-semibold">Attrition Summary</h3>
            <p className="text-xs text-wt-text-muted mt-1">
              Financial-Year Exit Metrics (Apr–Mar). Contractual exits are excluded.
              {attritionExitCount != null ? ` · ${attritionExitCount} Exit(s)` : ""}
            </p>
          </div>
          <DropdownSelectField
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
              {loadingAttrition ? <BlackLoader label="Loading Attrition %" size="sm" /> : formatPercent(attritionPercent)}
            </p>
          </article>
          <article className="rounded-xl border border-wt-border bg-wt-surface-2/60 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
              Voluntary %
            </p>
            <p className="text-2xl font-semibold mt-2 tabular-nums text-sky-700">
              {loadingAttrition ? <BlackLoader label="Loading Voluntary %" size="sm" /> : formatPercent(voluntaryPercent)}
            </p>
            <p className="text-xs text-wt-text-muted mt-1">Share Of FY Exits</p>
          </article>
          <article className="rounded-xl border border-wt-border bg-wt-surface-2/60 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
              Involuntary %
            </p>
            <p className="text-2xl font-semibold mt-2 tabular-nums text-amber-700">
              {loadingAttrition ? (
                <BlackLoader label="Loading Involuntary %" size="sm" />
              ) : (
                formatPercent(involuntaryPercent)
              )}
            </p>
            <p className="text-xs text-wt-text-muted mt-1">Share Of FY Exits</p>
          </article>
        </div>
      </div>

      <div className="relative rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        {submitting ? <LoadingOverlay label="Submitting Offboarding" /> : null}
        {loadingCandidates && !offboardCandidates.length ? (
          <LoadingPanel label="Loading Active Employees" className="min-h-[16rem]" />
        ) : (
          <>
            <h3 className="font-semibold mb-4">Employee Offboarding</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <DropdownSelectField
                label="Employee"
                required
                disabled={loadingCandidates}
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
              <DatePickerField
                label="Resignation Date"
                required
                disabled={isIntern}
                value={offboardingForm.resignation_date}
                onChange={(v) => setOffboardingForm((p) => ({ ...p, resignation_date: v }))}
              />
              <DatePickerField
                label="Last Working Day"
                required
                value={offboardingForm.last_working_day}
                onChange={handleLastWorkingDayChange}
              />
              {!isConsultant ? (
                <DropdownSelectField
                  label="Exit Type"
                  required
                  placeholder="Select Exit Type"
                  value={offboardingForm.exit_type}
                  options={EXIT_TYPE_OPTIONS}
                  onChange={(v) =>
                    setOffboardingForm((p) => ({
                      ...p,
                      exit_type:
                        v === "INVOLUNTARY" || v === "VOLUNTARY" || v === "CONTRACTUAL"
                          ? (v as ExitType)
                          : "",
                    }))
                  }
                />
              ) : (
                <div className="text-xs text-wt-text-muted flex flex-col gap-1">
                  <span>Exit Type</span>
                  <p className="rounded-lg border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm text-wt-text">
                    Contractual (Applied Automatically For Consultants)
                  </p>
                </div>
              )}
              <TextAreaField
                label="Reason"
                className="md:col-span-2"
                value={offboardingForm.reason}
                onChange={(v) => setOffboardingForm((p) => ({ ...p, reason: v }))}
                rows={4}
              />
              <TextAreaField
                label="Critical Skill"
                className="md:col-span-2"
                value={offboardingForm.critical_skill}
                onChange={(v) => setOffboardingForm((p) => ({ ...p, critical_skill: v }))}
                rows={4}
              />
              <TextAreaField
                label="Expected Behavior"
                className="md:col-span-2"
                value={offboardingForm.expected_behavior}
                onChange={(v) => setOffboardingForm((p) => ({ ...p, expected_behavior: v }))}
                rows={4}
              />
              <label className="text-xs text-wt-text-muted flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={offboardingForm.is_regretted}
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
            {isIntern ? (
              <p className="text-sm text-wt-text-muted mt-2">
                For Interns, Resignation Date is automatically set to the same value as Last Working Day.
              </p>
            ) : null}
            <div className="mt-4">
              <button
                type="button"
                className="btn-primary px-3 py-2 text-sm"
                disabled={!canSubmit || submitting || loadingCandidates}
                onClick={() => void submitOffboarding()}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <BlackLoader label="Submitting Offboarding" size="sm" />
                    Submitting Offboarding…
                  </span>
                ) : (
                  "Submit Offboarding"
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="relative rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        {loadingList && offboardedRows.length ? (
          <LoadingOverlay label="Loading Offboarded Employees" />
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Offboarded Employees</h3>
          <p className="text-xs text-wt-text-muted tabular-nums">
            {loadingList ? (
              <span className="inline-flex items-center gap-2">
                <BlackLoader label="Loading Offboarded Employees" size="sm" />
                Loading…
              </span>
            ) : (
              `${listTotal} Total`
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-wt-text-muted flex flex-col gap-1 min-w-[200px] flex-1">
            <span>Search</span>
            <input
              id="offboard-list-search"
              type="search"
              className="input-field px-3 py-2 text-sm"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search Offboarded Employees"
            />
          </label>
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
          <DropdownSelectField
            label="User Type"
            className="w-[10.5rem] shrink-0"
            value={filterType}
            onChange={(v) => {
              setFilterType(v);
              setListPage(0);
            }}
            placeholder="All Types"
            options={[
              { value: "", label: "All Types" },
              ...USER_TYPE_FILTER_OPTIONS.filter(Boolean).map((t) => ({
                value: t,
                label: formatUserTypeLabel(t),
              })),
            ]}
          />
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-sm h-10 border border-wt-border rounded-lg"
            onClick={() => void loadOffboardList()}
            disabled={loadingList}
          >
            Refresh Employees
          </button>
        </div>

        {loadingList && !offboardedRows.length ? (
          <LoadingPanel label="Loading Offboarded Employees" />
        ) : offboardedRows.length ? (
          <>
            <div className="wt-scroll-both max-h-[min(60vh,480px)] overflow-auto rounded-xl border border-wt-border">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
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
                      Resignation Date
                    </th>
                    <th className={`${STICKY_HEADER_CLASS} text-left px-3 py-2 font-medium whitespace-nowrap`}>
                      Last Working Day
                    </th>
                    <th className={`${STICKY_HEADER_CLASS} text-right px-3 py-2 font-medium whitespace-nowrap`}>
                      Notice (Days)
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
                      <td className="px-3 py-2 whitespace-nowrap">{formatExitTypeLabel(row.exit_type)}</td>
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
