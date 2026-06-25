"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
  TableCheckbox,
} from "@/components/dashboard/ui/wtTable";
import { useEffect, useMemo, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import { exitInterviewService } from "@/services/exitInterview.service";
import type { ExitSurveyBulkResendItemResult } from "@/types/exit-interview";
import {
  DatePickerField,
  DropdownSelectField,
  InputField,
} from "@/components/dashboard/ui/forms";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
import { ManagementListCard, ManagementListContent } from "@/components/dashboard/ui/ManagementListCard";
import { SearchInput } from "@/components/dashboard/ui/SearchInput";
import { FormGridSkeleton, MetricCardsSkeleton } from "@/components/dashboard/ui/SectionSkeleton";
import {
  CARD_CONTENT_BELOW_TOOLBAR_CLASS,
  CARD_CONTENT_STACK_CLASS,
  CARD_FORM_ACTIONS_CLASS,
  CARD_FORM_GRID_CLASS,
  CARD_STACK_CLASS,
} from "@/components/dashboard/ui/uiLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatApiDateDisplay } from "@/utils/apiDate";
import {
  financialYearSelectOptions,
  OFFBOARDING_LIST_PAGE_SIZE,
  useOffboardingPanelQueries,
} from "@/hooks/offboarding/useOffboardingPanelQueries";
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
import {
  isResendableOffboardListRow,
  mergeEmpIdSelection,
  resendableOffboardEmpIds,
} from "@/utils/exitSurveyFollowUp";

const USER_TYPE_FILTER_OPTIONS = ["", "FULLTIME", "INTERN", "CONSULTANT"] as const;

const INNER_SCROLL_CLASS =
  "wt-scroll-both max-h-[min(70vh,560px)] overflow-auto overscroll-behavior-auto rounded-xl border border-wt-border";

function formatPercent(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n}%`;
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
  const {
    listPage,
    setListPage,
    search,
    setSearch,
    filterFromDate,
    setFilterFromDate,
    filterToDate,
    setFilterToDate,
    filterType,
    setFilterType,
    fyStartYear,
    setFyStartYear,
    offboardCandidates,
    offboardedRows,
    listTotal,
    loadingAttrition,
    loadingCandidates,
    loadingList,
    attritionPercent,
    voluntaryPercent,
    involuntaryPercent,
    attritionExitCount,
    refreshOffboardingData,
    refetchList,
  } = useOffboardingPanelQueries();

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

  useEffect(() => {
    setSelectedEmpIds([]);
    setBulkResendResults([]);
  }, [search, filterType, filterFromDate, filterToDate, listPage]);

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


  const totalPages = Math.max(1, Math.ceil(listTotal / OFFBOARDING_LIST_PAGE_SIZE) || 1);
  const rangeStart = listTotal === 0 ? 0 : listPage * OFFBOARDING_LIST_PAGE_SIZE + 1;
  const rangeEnd = Math.min(listTotal, (listPage + 1) * OFFBOARDING_LIST_PAGE_SIZE);

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

  function handleResignationDateChange(value: string) {
    setOffboardingForm((prev) => ({
      ...prev,
      resignation_date: value,
      last_working_day: value.trim() ? defaultLastWorkingDayFromResignation(value) : "",
    }));
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
    const lastWorkingDay =
      offboardingForm.last_working_day.trim() ||
      defaultLastWorkingDayFromResignation(resignationDate);
    if (!lastWorkingDay) {
      showErrorToast("Last working day could not be calculated from resignation date.");
      return;
    }

    setSubmitting(true);
    try {
      await hrmsService.offboardEmployee(empIdValue, {
        exit_type: resolveExitTypeForSubmit(),
        resignation_date: resignationDate,
        last_working_day: isInternOffboarding ? lastWorkingDay : undefined,
        reason: offboardingForm.reason.trim() || null,
        critical_skill: offboardingForm.critical_skill.trim() || null,
        is_regretted: offboardingForm.is_regretted,
      });
      setOffboardingForm(createEmptyOffboardingForm());
      setListPage(0);
      showSuccessToast("Employee offboarded successfully.");
      await refreshOffboardingData();
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
    <section className={CARD_STACK_CLASS}>
      <Card className="p-0">
        <CardHeader className="flex-row items-end justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Attrition Summary</CardTitle>
            <CardDescription>
              Financial-year exit metrics (Apr–Mar)
              {attritionExitCount != null && !loadingAttrition
                ? ` · ${attritionExitCount} exit(s)`
                : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <Separator />
        <CardToolbar className="flex justify-end">
          <DropdownSelectField
            label="Financial Year (Start)"
            className="w-[11rem] shrink-0"
            value={fyStartYear}
            onChange={setFyStartYear}
            options={financialYearSelectOptions()}
          />
        </CardToolbar>
        <CardContent className={CARD_CONTENT_BELOW_TOOLBAR_CLASS}>
          {loadingAttrition ? (
            <MetricCardsSkeleton count={3} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-xl border border-wt-border bg-wt-surface-2/60 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
                  Attrition %
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-rose-700">
                  {formatPercent(attritionPercent)}
                </p>
              </article>
              <article className="rounded-xl border border-wt-border bg-wt-surface-2/60 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
                  Voluntary %
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-sky-700">
                  {formatPercent(voluntaryPercent)}
                </p>
                <p className="mt-1 text-xs text-wt-text-muted">Share of FY exits</p>
              </article>
              <article className="rounded-xl border border-wt-border bg-wt-surface-2/60 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
                  Involuntary %
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-700">
                  {formatPercent(involuntaryPercent)}
                </p>
                <p className="mt-1 text-xs text-wt-text-muted">Share of FY exits</p>
              </article>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader>
          <CardTitle>Employee Offboarding</CardTitle>
          <CardDescription>
            Record resignation details and submit offboarding for an active employee.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent>
          {loadingCandidates && !offboardCandidates.length ? (
            <FormGridSkeleton fields={8} />
          ) : (
            <div className={CARD_CONTENT_STACK_CLASS}>
            <div className={CARD_FORM_GRID_CLASS}>
              <DropdownSelectField
                label="Employee"
                required
                disabled={loadingCandidates || submitting}
                placeholder={
                  candidateOptions.length ? "Select Employee" : "No Active Employees Available"
                }
                value={offboardingForm.emp_id}
                onChange={handleEmployeeChange}
                options={candidateOptions}
              />
              <DatePickerField
                label="Resignation Date"
                required
                value={offboardingForm.resignation_date}
                onChange={handleResignationDateChange}
                disabled={submitting || isInternOffboarding}
              />
              <DatePickerField
                label="Last Working Day"
                required={isInternOffboarding || isConsultantOffboarding}
                value={offboardingForm.last_working_day}
                onChange={handleLastWorkingDayChange}
                disabled={submitting || !isInternOffboarding}
              />
              <DropdownSelectField
                label="Exit Type"
                required
                placeholder="Select exit type"
                value={isConsultantOffboarding ? CONSULTANT_EXIT_TYPE : offboardingForm.exit_type}
                options={EXIT_TYPE_OPTIONS.filter((opt) => opt.value !== CONSULTANT_EXIT_TYPE)}
                onChange={(v) =>
                  setOffboardingForm((p) => ({
                    ...p,
                    exit_type:
                      v === "INVOLUNTARY" || v === "VOLUNTARY"
                        ? (v as ExitType)
                        : "",
                  }))
                }
                disabled={submitting || isConsultantOffboarding}
              />
              <InputField
                label="Reason"
                value={offboardingForm.reason}
                onChange={(v) => setOffboardingForm((p) => ({ ...p, reason: v }))}
                placeholder="Enter reason for offboarding"
                disabled={submitting}
              />
              <InputField
                label="Critical Skill"
                value={offboardingForm.critical_skill}
                onChange={(v) => setOffboardingForm((p) => ({ ...p, critical_skill: v }))}
                placeholder="Describe critical skills impacted"
                disabled={submitting}
              />
              <Label className="flex items-center gap-2 text-xs font-normal text-wt-text-muted md:col-span-2">
                <Checkbox
                  checked={offboardingForm.is_regretted}
                  disabled={submitting}
                  onCheckedChange={(checked) =>
                    setOffboardingForm((p) => ({ ...p, is_regretted: Boolean(checked) }))
                  }
                />
                Is Regretted
              </Label>
            </div>
            {offboardingNoticeLabel ? (
              <p className="text-sm text-wt-text-muted">{offboardingNoticeLabel}</p>
            ) : null}
            <div className={CARD_FORM_ACTIONS_CLASS}>
              <Button
                variant="brand"
                size="sm"
                type="button"
                className="px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSubmit || submitting || loadingCandidates}
                onClick={() => void submitOffboarding()}
              >
                {submitting ? "Submitting Offboarding…" : "Submit Offboarding"}
              </Button>
            </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ManagementListCard
        title="Offboarded Employees"
        description={
          loadingList
            ? "Loading offboarded employees…"
            : `${listTotal} total employee${listTotal === 1 ? "" : "s"}`
        }
        search={
          <SearchInput
            id="offboard-list-search"
            value={search}
            onChange={setSearch}
            placeholder="Search"
            aria-label="Search offboarded employees"
            disabled={loadingList}
          />
        }
        filters={
          <>
            <DatePickerField
              label="LWD From"
              value={filterFromDate}
              onChange={setFilterFromDate}
              className="w-[10.5rem] shrink-0"
            />
            <DatePickerField
              label="LWD To"
              value={filterToDate}
              onChange={setFilterToDate}
              className="w-[10.5rem] shrink-0"
            />
            <DropdownSelectField
              label="User Type"
              className="w-[10.5rem] shrink-0"
              value={filterType}
              onChange={setFilterType}
              placeholder="All types"
              options={[
                { value: "", label: "All types" },
                ...USER_TYPE_FILTER_OPTIONS.filter(Boolean).map((t) => ({
                  value: t,
                  label: formatUserTypeLabel(t),
                })),
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-10 px-3 py-2 text-sm"
              onClick={() => void refetchList()}
              disabled={loadingList}
            >
              Refresh
            </Button>
            {selectedResendableCount > 0 ? (
              <Button
                variant="brand"
                size="sm"
                type="button"
                className="h-10 px-3 py-2 text-sm"
                disabled={loadingList || bulkResending || Boolean(resendingEmpId)}
                onClick={() => void handleBulkResendExitSurvey()}
              >
                {bulkResending
                  ? "Sending…"
                  : `Resend Exit Survey (${selectedResendableCount})`}
              </Button>
            ) : null}
          </>
        }
      >
        {bulkResendResults.length ? (
          <div className="space-y-2 rounded-xl border border-wt-border bg-wt-surface-2/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Bulk Resend Results</h4>
              <Button variant="ghost" size="xs" type="button" className="px-2 py-1 text-xs" onClick={() => setBulkResendResults([])}
              >
                Dismiss
              </Button>
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

        <ManagementListContent
          isLoading={loadingList}
          isEmpty={!loadingList && !offboardedRows.length}
          emptyTitle="No Offboarded Employees Found"
          emptyDescription="Try adjusting your search or filters."
          skeletonRows={8}
          skeletonColumns={10}
        >
          <div className={INNER_SCROLL_CLASS}>
              <WtTable className="min-w-full border-separate border-spacing-0">
                <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <span className="sr-only">Select</span>
                      <TableCheckbox
                        checked={allResendableOnPageSelected}
                        indeterminate={
                          someResendableOnPageSelected && !allResendableOnPageSelected
                        }
                        disabled={
                          !resendableEmpIdsOnPage.length ||
                          loadingList ||
                          bulkResending ||
                          Boolean(resendingEmpId)
                        }
                        onCheckedChange={(checked) => toggleSelectAllOnPage(checked)}
                        aria-label="Select all resendable employees on this page"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Exit Type</TableHead>
                    <TableHead>Resignation</TableHead>
                    <TableHead>Last Working Day</TableHead>
                    <TableHead className="text-right">
                      Notice (days)
                    </TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Band</TableHead>
                    <TableHead>Regretted</TableHead>
                    <TableHead>Actions</TableHead>
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
                      className={`hover:bg-wt-page-bg/50 ${
                        isSelected ? "bg-indigo-50/70" : ""
                      }`}
                    >
                      <TableCell className="px-3 py-2">
                        {canResend ? (
                          <TableCheckbox
                            checked={isSelected}
                            disabled={loadingList || bulkResending || isResending}
                            onCheckedChange={(checked) =>
                              toggleRowSelection(empId, checked)
                            }
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
                          <Button variant="brand" size="xs" type="button" className="px-2.5 py-1 text-xs" disabled={loadingList || isResending || bulkResending} onClick={() => void handleResendExitSurvey(empId, row.email)}
                          >
                            {isResending ? "Sending…" : "Resend Exit Survey"}
                          </Button>
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
              pageSize={OFFBOARDING_LIST_PAGE_SIZE}
              onPageChange={setListPage}
            />
        </ManagementListContent>
      </ManagementListCard>
    </section>
  );
}
