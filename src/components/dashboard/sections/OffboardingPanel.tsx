"use client";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { useCallback, useEffect, useMemo, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import { exitInterviewService } from "@/services/exitInterview.service";
import type { ExitSurveyBulkResendItemResult } from "@/types/exit-interview";
import type { HrOffboardListItem } from "@/types/offboard";
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
  CONSULTANT_EXIT_TYPE,
  DEFAULT_NOTICE_PERIOD_DAYS,
  createEmptyOffboardingForm,
  defaultLastWorkingDayFromResignation,
  EXIT_TYPE_OPTIONS,
  formatExitTypeLabel,
  formatUserTypeLabel,
  isOffboardingFormValid,
  type ExitType,
} from "@/utils/offboardingFormState";
import { normalizeEmployeeStatusKey } from "@/utils/userStatus";
import {
  isResendableOffboardListRow,
  mergeEmpIdSelection,
  resendableOffboardEmpIds,
} from "@/utils/exitSurveyFollowUp";


type OffboardCandidate = {
  emp_id: string;
  name: string;
  email: string;
  user_type: string;
};

const DEFAULT_PAGE_SIZE = 10;

const USER_TYPE_FILTER_OPTIONS = ["", "FULLTIME", "INTERN", "CONSULTANT"] as const;

const STICKY_HEADER_CLASS =
  "sticky top-0 z-10 bg-wt-surface-2 shadow-[inset_0_-1px_0_var(--wt-border)]";

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

function bulkResendResultClassName(
  status: ExitSurveyBulkResendItemResult["status"]
): string {
  if (status === "SENT") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "FAILED") return "border-red-200 bg-red-50 text-red-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

export function OffboardingPanel() {
  const [offboardingForm, setOffboardingForm] = useState(createEmptyOffboardingForm);
  const [offboardCandidates, setOffboardCandidates] = useState<OffboardCandidate[]>([]);
  const [offboardedRows, setOffboardedRows] = useState<HrOffboardListItem[]>([]);
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
  const [resendingEmpId, setResendingEmpId] = useState<string | null>(null);
  const [bulkResending, setBulkResending] = useState(false);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [bulkResendResults, setBulkResendResults] = useState<ExitSurveyBulkResendItemResult[]>(
    []
  );
  
  const selectedCandidate = useMemo(
    () => offboardCandidates.find((row) => row.emp_id === offboardingForm.emp_id) ?? null,
    [offboardCandidates, offboardingForm.emp_id]
  );
  const selectedUserType = selectedCandidate?.user_type ?? "";
  const isInternOffboarding = selectedUserType.toUpperCase() === "INTERN";
  const isConsultantOffboarding = selectedUserType.toUpperCase() === "CONSULTANT";

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
      setOffboardedRows((data?.items ?? []) as unknown as HrOffboardListItem[]);
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
      showErrorToast(msg);
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
          data: { items: [] as HrOffboardListItem[], total: 0, page: 0, size: 0 },
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
              if (
                status === "INACTIVE" ||
                normalizeEmployeeStatusKey(status) === "IN_NOTICE"
              ) {
                return null;
              }
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
      showErrorToast("Failed to load active employees for offboarding.");
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
  }, [debouncedSearch, filterType, filterFromDate, filterToDate]);

  useEffect(() => {
    setSelectedEmpIds([]);
    setBulkResendResults([]);
  }, [debouncedSearch, filterType, filterFromDate, filterToDate, listPage]);

  const resendableEmpIdsOnPage = useMemo(
    () => resendableOffboardEmpIds(offboardedRows),
    [offboardedRows]
  );

  const selectedResendableCount = selectedEmpIds.length;
  const allResendableOnPageSelected =
    resendableEmpIdsOnPage.length > 0 &&
    resendableEmpIdsOnPage.every((empId) => selectedEmpIds.includes(empId));
  const someResendableOnPageSelected =
    resendableEmpIdsOnPage.some((empId) => selectedEmpIds.includes(empId)) &&
    !allResendableOnPageSelected;

  function toggleRowSelection(empId: string, checked: boolean) {
    const normalized = empId.trim();
    if (!normalized) return;
    setSelectedEmpIds((prev) => {
      if (checked) {
        return mergeEmpIdSelection(prev, [normalized]);
      }
      return prev.filter((id) => id !== normalized);
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!checked) {
      setSelectedEmpIds((prev) =>
        prev.filter((empId) => !resendableEmpIdsOnPage.includes(empId))
      );
      return;
    }
    setSelectedEmpIds((prev) => mergeEmpIdSelection(prev, resendableEmpIdsOnPage));
  }

  async function handleResendExitSurvey(empId: string, employeeEmail?: string) {
    const normalized = empId.trim();
    if (!normalized) return;
    setResendingEmpId(normalized);
    let successMessage: string | null = null;
    let errorMessage: string | null = null;
    try {
      const res = await exitInterviewService.resendSurvey(normalized);
      const email = employeeEmail?.trim() || res.data?.email?.trim();
      successMessage =
        res.data?.message?.trim() ||
        (email
          ? `Exit survey reminder sent to ${email}.`
          : "Exit survey reminder sent successfully.");
    } catch (error) {
      errorMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to resend exit survey.";
    } finally {
      setResendingEmpId(null);
    }
    if (successMessage) {
      showSuccessToast(successMessage);
    } else if (errorMessage) {
      showErrorToast(errorMessage);
    }
  }

  async function handleBulkResendExitSurvey() {
    if (!selectedEmpIds.length || bulkResending) return;
    setBulkResending(true);
    let resultSummary: string | null = null;
    let resultIsError = false;
    let errorMessage: string | null = null;
    try {
      const res = await exitInterviewService.resendSurveyBulk(selectedEmpIds);
      const data = res.data;
      const summary =
        res.message?.trim() ||
        `Exit survey reminders processed: ${data?.sent_count ?? 0} sent, ${data?.skipped_count ?? 0} skipped${
          data?.failed_count ? `, ${data.failed_count} failed` : ""
        }.`;
      resultSummary = summary;
      resultIsError = (data?.failed_count ?? 0) > 0;
      setSelectedEmpIds([]);
      setBulkResendResults(data?.results ?? []);
    } catch (error) {
      errorMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to resend exit surveys.";
    } finally {
      setBulkResending(false);
    }
    if (resultSummary) {
      if (resultIsError) showErrorToast(resultSummary);
      else showSuccessToast(resultSummary);
    } else if (errorMessage) {
      showErrorToast(errorMessage);
    }
  }


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
    if (isInternOffboarding && l) {
      return "Intern offboarding uses a single exit date for resignation and last working day.";
    }
    if (isConsultantOffboarding) {
      return "Consultant offboarding is recorded as a Contractual exit and is excluded from attrition metrics.";
    }
    if (!r) {
      return `Last working day defaults to ${DEFAULT_NOTICE_PERIOD_DAYS} calendar days after resignation when not set.`;
    }
    if (!l) {
      const defaultLwd = defaultLastWorkingDayFromResignation(r);
      if (defaultLwd) {
        return `Last working day will default to ${DEFAULT_NOTICE_PERIOD_DAYS} calendar days after resignation (${defaultLwd}).`;
      }
      return null;
    }
    const a = new Date(r);
    const b = new Date(l);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) {
      return "Resignation date must be on or before last working day.";
    }
    const days = Math.round((b.getTime() - a.getTime()) / 86400000);
    return `Notice period (resignation → last working day): ${Math.max(0, days)} calendar day(s).`;
  }, [
    offboardingForm.resignation_date,
    offboardingForm.last_working_day,
    isInternOffboarding,
    isConsultantOffboarding,
  ]);

  function resolveExitTypeForSubmit(): ExitType {
    if (isConsultantOffboarding) return CONSULTANT_EXIT_TYPE;
    return offboardingForm.exit_type as ExitType;
  }

  function handleEmployeeChange(empId: string) {
    const candidate = offboardCandidates.find((row) => row.emp_id === empId);
    const isIntern = candidate?.user_type === "INTERN";
    const isConsultant = candidate?.user_type === "CONSULTANT";
    setOffboardingForm((prev) => {
      const next = {
        ...createEmptyOffboardingForm(),
        emp_id: empId,
        exit_type: (isConsultant ? CONSULTANT_EXIT_TYPE : "") as "" | ExitType,
      };
      if (isIntern && prev.last_working_day.trim()) {
        next.last_working_day = prev.last_working_day;
        next.resignation_date = prev.last_working_day;
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
    if (!canSubmit) return;

    const empIdValue = offboardingForm.emp_id.trim();
    const resignationDate = offboardingForm.resignation_date.trim();
    const lastWorkingDay = offboardingForm.last_working_day.trim();

    setSubmitting(true);
    try {
      await hrmsService.offboardEmployee(empIdValue, {
        resignation_date: resignationDate,
        exit_type: resolveExitTypeForSubmit(),
        last_working_day: lastWorkingDay || undefined,
        reason: offboardingForm.reason.trim() || null,
        expected_behavior: offboardingForm.expected_behavior.trim() || null,
        critical_skill: offboardingForm.critical_skill.trim() || null,
        is_regretted: offboardingForm.is_regretted,
      });
      setOffboardingForm(createEmptyOffboardingForm());
      setListPage(0);
      showSuccessToast("Employee offboarded successfully.");
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
      showErrorToast(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative flex min-h-0 flex-col gap-4">
            <div className="relative rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        {loadingAttrition ? <LoadingOverlay label="Loading Attrition Summary" /> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-semibold">Attrition Summary</h3>
            <p className="text-xs text-wt-text-muted mt-1">
              Financial-year exit metrics (Apr–Mar). Contractual exits are excluded.
              {attritionExitCount != null ? ` · ${attritionExitCount} exit(s)` : ""}
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
              {loadingAttrition ? (
                <BlackLoader label="Loading Attrition %" size="sm" />
              ) : (
                formatPercent(attritionPercent)
              )}
            </p>
          </article>
          <article className="rounded-xl border border-wt-border bg-wt-surface-2/60 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
              Voluntary %
            </p>
            <p className="text-2xl font-semibold mt-2 tabular-nums text-sky-700">
              {loadingAttrition ? (
                <BlackLoader label="Loading Voluntary %" size="sm" />
              ) : (
                formatPercent(voluntaryPercent)
              )}
            </p>
            <p className="text-xs text-wt-text-muted mt-1">Share of FY exits</p>
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
            <p className="text-xs text-wt-text-muted mt-1">Share of FY exits</p>
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
                <DatePickerField
                  label="Last Working Day"
                  required
                  value={offboardingForm.last_working_day}
                  onChange={handleLastWorkingDayChange}
                  disabled={submitting}
                />
              ) : (
                <>
                  <DatePickerField
                    label="Resignation Date"
                    required
                    value={offboardingForm.resignation_date}
                    onChange={(v) =>
                      setOffboardingForm((p) => ({
                        ...p,
                        resignation_date: v,
                        last_working_day: v.trim()
                          ? defaultLastWorkingDayFromResignation(v)
                          : "",
                      }))
                    }
                    disabled={submitting}
                  />
                  <DatePickerField
                    label="Last Working Day"
                    value={offboardingForm.last_working_day}
                    onChange={handleLastWorkingDayChange}
                    disabled={submitting}
                  />
                </>
              )}
              {!isConsultantOffboarding ? (
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
                  disabled={submitting}
                />
              ) : (
                <div className="text-xs text-wt-text-muted flex flex-col gap-1">
                  <span>Exit Type</span>
                  <p className="rounded-lg border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm text-wt-text">
                    Contractual (applied automatically for consultants)
                  </p>
                </div>
              )}
              <TextAreaField
                label="Reason"
                className="md:col-span-2"
                rows={5}
                value={offboardingForm.reason}
                onChange={(v) => setOffboardingForm((p) => ({ ...p, reason: v }))}
                placeholder="Enter a detailed reason for offboarding"
              />
              <TextAreaField
                label="Critical Skill"
                className="md:col-span-2"
                rows={5}
                value={offboardingForm.critical_skill}
                onChange={(v) => setOffboardingForm((p) => ({ ...p, critical_skill: v }))}
                placeholder="Describe critical skills impacted by this exit"
              />
              <TextAreaField
                label="Expected Behavior"
                className="md:col-span-2"
                rows={5}
                value={offboardingForm.expected_behavior}
                onChange={(v) => setOffboardingForm((p) => ({ ...p, expected_behavior: v }))}
                placeholder="Describe expected behavior during notice period"
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

      <div className="relative rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4 min-h-0">
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
              `${listTotal} total`
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="sr-only" htmlFor="offboard-list-search">
            Search
          </label>
          <Input
            id="offboard-list-search"
            type="search"
            className="h-10 min-w-[200px] flex-1"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search offboarded employees"
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
          <DropdownSelectField
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
            Refresh
          </button>
          {selectedResendableCount > 0 ? (
            <button
              type="button"
              className="btn-action ml-auto px-3 py-2 text-sm h-10"
              disabled={loadingList || bulkResending || Boolean(resendingEmpId)}
              onClick={() => void handleBulkResendExitSurvey()}
            >
              {bulkResending
                ? "Sending…"
                : `Resend Exit Survey (${selectedResendableCount})`}
            </button>
          ) : null}
        </div>

        {bulkResendResults.length ? (
          <div className="space-y-2 rounded-xl border border-wt-border bg-wt-surface-2/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Bulk Resend Results</h4>
              <button
                type="button"
                className="btn-ghost px-2 py-1 text-xs"
                onClick={() => setBulkResendResults([])}
              >
                Dismiss
              </button>
            </div>
            <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
              {bulkResendResults.map((result) => (
                <li
                  key={`${result.emp_id}-${result.status}`}
                  className={`rounded-lg border px-3 py-2 ${bulkResendResultClassName(result.status)}`}
                >
                  <p className="font-medium">
                    {result.employee_name || result.emp_id}
                    {result.email ? ` · ${result.email}` : ""}
                  </p>
                  <p className="text-xs mt-0.5">{result.message}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {loadingList && !offboardedRows.length ? (
          <LoadingPanel label="Loading Offboarded Employees" />
        ) : offboardedRows.length ? (
          <>
            <div className={INNER_SCROLL_CLASS}>
              <WtTable className="min-w-full border-separate border-spacing-0">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={`${STICKY_HEADER_CLASS} w-10`}>
                      <span className="sr-only">Select</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-wt-border"
                        checked={allResendableOnPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someResendableOnPageSelected;
                        }}
                        disabled={
                          !resendableEmpIdsOnPage.length ||
                          loadingList ||
                          bulkResending ||
                          Boolean(resendingEmpId)
                        }
                        onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                        aria-label="Select all resendable employees on this page"
                      />
                    </TableHead>
                    <TableHead className={STICKY_HEADER_CLASS}>Name</TableHead>
                    <TableHead className={STICKY_HEADER_CLASS}>Status</TableHead>
                    <TableHead className={STICKY_HEADER_CLASS}>Exit Type</TableHead>
                    <TableHead className={STICKY_HEADER_CLASS}>Resignation</TableHead>
                    <TableHead className={STICKY_HEADER_CLASS}>Last Working Day</TableHead>
                    <TableHead className={`${STICKY_HEADER_CLASS} text-right`}>
                      Notice (days)
                    </TableHead>
                    <TableHead className={STICKY_HEADER_CLASS}>Designation</TableHead>
                    <TableHead className={STICKY_HEADER_CLASS}>Band</TableHead>
                    <TableHead className={STICKY_HEADER_CLASS}>Regretted</TableHead>
                    <TableHead className={STICKY_HEADER_CLASS}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offboardedRows.map((row) => {
                    const empId = String(row.emp_id ?? "").trim();
                    const canResend = isResendableOffboardListRow(row);
                    const isResending = Boolean(empId && resendingEmpId === empId);
                    const isSelected = Boolean(empId && selectedEmpIds.includes(empId));
                    const surveySubmitted =
                      row.exit_survey_submitted === true || row.submission_status === "SUBMITTED";

                    return (
                    <TableRow
                      key={row.emp_id}
                      className={`hover:bg-muted/50 ${
                        isSelected ? "bg-indigo-50/70" : ""
                      }`}
                    >
                      <TableCell className="px-3 py-2">
                        {canResend ? (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-wt-border"
                            checked={isSelected}
                            disabled={loadingList || bulkResending || isResending}
                            onChange={(e) => toggleRowSelection(empId, e.target.checked)}
                            aria-label={`Select ${row.employee_name || empId}`}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap">{row.employee_name || "—"}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap">
                        <EmployeeStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap">
                        {formatExitTypeLabel(row.exit_type)}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {formatApiDateDisplay(row.resignation_date) || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {formatApiDateDisplay(row.last_working_day) || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                        {row.notice_period_days ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                        {row.designation ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap max-w-[160px] truncate">
                        {row.band_name ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap">{formatBool(row.is_regretted)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap">
                        {canResend ? (
                          <button
                            type="button"
                            className="btn-action px-2.5 py-1 text-xs"
                            disabled={loadingList || isResending || bulkResending}
                            onClick={() => void handleResendExitSurvey(empId, row.email)}
                          >
                            {isResending ? "Sending…" : "Resend Exit Survey"}
                          </button>
                        ) : surveySubmitted ? (
                          <span className="text-xs font-medium text-emerald-700">Submitted</span>
                        ) : (
                          <span className="text-xs text-wt-text-muted">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </WtTable>
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
