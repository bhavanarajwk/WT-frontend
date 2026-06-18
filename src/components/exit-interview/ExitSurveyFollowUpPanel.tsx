"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import { exitInterviewService } from "@/services/exitInterview.service";
import type { ExitSurveyBulkResendItemResult } from "@/types/exit-interview";
import type { OffboardListItem } from "@/types/offboard";
import { DatePickerField, SelectField } from "@/components/dashboard/ui/forms";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";
import { toPagedRows } from "@/utils/apiRows";
import { formatApiDateDisplay } from "@/utils/apiDate";
import {
  activeSortDirectionForColumn,
  toggleColumnSort,
} from "@/utils/listSort";
import {
  canViewExitSurveySubmission,
  DEFAULT_EXIT_SURVEY_LWD_SORT_ID,
  DEFAULT_EXIT_SURVEY_STATUS_FILTER,
  exitInterviewSubmissionDetailPath,
  EXIT_SURVEY_LWD_SORT_OPTIONS,
  filterExitSurveyFollowUpByStatus,
  filterInNoticeFollowUpRows,
  followUpRowLookupId,
  isResendableFollowUpRow,
  mergeEmpIdSelection,
  mergeExitSurveyFollowUpRows,
  paginateFollowUpRows,
  resendableEmpIdFromRow,
  resendableEmpIdsFromRows,
  sortExitSurveyFollowUpRows,
  type ExitSurveyFollowUpRow,
  type ExitSurveyStatusFilter,
} from "@/utils/exitSurveyFollowUp";

type Toast = { type: "success" | "error"; message: string } | null;

const DEFAULT_PAGE_SIZE = 10;
const FOLLOW_UP_FETCH_SIZE = 100;
const USER_TYPE_FILTER_OPTIONS = ["", "FULLTIME", "INTERN", "CONSULTANT"] as const;

function bulkResendResultClassName(
  status: ExitSurveyBulkResendItemResult["status"]
): string {
  if (status === "SENT") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "FAILED") return "border-red-200 bg-red-50 text-red-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

export function ExitSurveyFollowUpPanel() {
  const router = useRouter();
  const [allRows, setAllRows] = useState<ExitSurveyFollowUpRow[]>([]);
  const [listPage, setListPage] = useState(0);
  const [listPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [lwdSortId, setLwdSortId] = useState(DEFAULT_EXIT_SURVEY_LWD_SORT_ID);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSurveyStatus, setFilterSurveyStatus] = useState<ExitSurveyStatusFilter>(
    DEFAULT_EXIT_SURVEY_STATUS_FILTER
  );

  const [loadingList, setLoadingList] = useState(false);
  const [resendingEmpId, setResendingEmpId] = useState<string | null>(null);
  const [bulkResending, setBulkResending] = useState(false);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [bulkResendResults, setBulkResendResults] = useState<ExitSurveyBulkResendItemResult[]>(
    []
  );
  const [toast, setToast] = useState<Toast>(null);

  const loadFollowUpList = useCallback(async () => {
    setLoadingList(true);
    try {
      const hasCustomLwdFilter = Boolean(filterFromDate.trim() || filterToDate.trim());
      const [offboardResult, onboardResult] = await Promise.allSettled([
        hrmsService.getOffboardList({
          page: 0,
          size: FOLLOW_UP_FETCH_SIZE,
          search: debouncedSearch.trim() || undefined,
          type: filterType.trim() || undefined,
          fromDate: hasCustomLwdFilter ? filterFromDate.trim() || undefined : undefined,
          toDate: hasCustomLwdFilter ? filterToDate.trim() || undefined : undefined,
        }),
        hrmsService.getOnboardList({ page: "0", size: "500" }),
      ]);

      const offboardRes = offboardResult.status === "fulfilled" ? offboardResult.value : null;
      const onboardRes = onboardResult.status === "fulfilled" ? onboardResult.value : null;

      if (offboardResult.status === "rejected" && onboardResult.status === "rejected") {
        throw offboardResult.reason;
      }

      const data = offboardRes?.data;

      const onboardRows = onboardRes
        ? toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes)
        : [];
      const inNoticeRows = filterInNoticeFollowUpRows(onboardRows, {
        search: debouncedSearch,
        type: filterType,
        fromDate: hasCustomLwdFilter ? filterFromDate : undefined,
        toDate: hasCustomLwdFilter ? filterToDate : undefined,
      });
      const merged = mergeExitSurveyFollowUpRows(
        (data?.items ?? []) as OffboardListItem[],
        inNoticeRows
      );
      setAllRows(merged);

      if (offboardResult.status === "rejected") {
        const reason = offboardResult.reason;
        const msg =
          reason instanceof ApiError
            ? reason.message
            : reason instanceof Error
              ? reason.message
              : "Offboard list failed; showing in-notice employees only.";
        setToast({ type: "error", message: msg });
      }
    } catch (error) {
      setAllRows([]);
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load exit survey follow-up list.";
      setToast({ type: "error", message: msg });
    } finally {
      setLoadingList(false);
    }
  }, [debouncedSearch, filterType, filterFromDate, filterToDate]);

  useEffect(() => {
    void loadFollowUpList();
  }, [loadFollowUpList]);

  const filteredRows = useMemo(
    () => filterExitSurveyFollowUpByStatus(allRows, filterSurveyStatus),
    [allRows, filterSurveyStatus]
  );

  const sortedRows = useMemo(
    () => sortExitSurveyFollowUpRows(filteredRows, lwdSortId),
    [filteredRows, lwdSortId]
  );

  const listTotal = sortedRows.length;

  const rows = useMemo(
    () => paginateFollowUpRows(sortedRows, listPage, listPageSize),
    [sortedRows, listPage, listPageSize]
  );

  useEffect(() => {
    setListPage(0);
  }, [debouncedSearch, filterType, filterFromDate, filterToDate, lwdSortId, filterSurveyStatus]);

  useEffect(() => {
    setSelectedEmpIds([]);
    setBulkResendResults([]);
  }, [debouncedSearch, filterType, filterFromDate, filterToDate, filterSurveyStatus]);

  const resendableEmpIdsOnPage = useMemo(
    () => resendableEmpIdsFromRows(rows),
    [rows]
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

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const totalPages = Math.max(1, Math.ceil(listTotal / listPageSize) || 1);
  const rangeStart = listTotal === 0 ? 0 : listPage * listPageSize + 1;
  const rangeEnd = Math.min(listTotal, (listPage + 1) * listPageSize);

  async function handleResendExitSurvey(empId: string, employeeEmail?: string) {
    const normalized = empId.trim();
    if (!normalized) return;
    setResendingEmpId(normalized);
    setToast(null);
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
      setToast({ type: "success", message: successMessage });
    } else if (errorMessage) {
      setToast({ type: "error", message: errorMessage });
    }
  }

  async function handleBulkResendExitSurvey() {
    if (!selectedEmpIds.length || bulkResending) return;
    setBulkResending(true);
    setToast(null);
    let successToast: Toast = null;
    let errorMessage: string | null = null;
    try {
      const res = await exitInterviewService.resendSurveyBulk(selectedEmpIds);
      const data = res.data;
      const summary =
        res.message?.trim() ||
        `Exit survey reminders processed: ${data?.sent_count ?? 0} sent, ${data?.skipped_count ?? 0} skipped${
          data?.failed_count ? `, ${data.failed_count} failed` : ""
        }.`;
      successToast = {
        type: (data?.failed_count ?? 0) > 0 ? "error" : "success",
        message: summary,
      };
      setSelectedEmpIds([]);
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
    if (successToast) {
      setToast(successToast);
    } else if (errorMessage) {
      setToast({ type: "error", message: errorMessage });
    }
  }

  return (
    <div className="space-y-4">
      <DashboardToast toast={toast} position="top" />

      <div className="flex flex-wrap items-end gap-3">
        <label className="sr-only" htmlFor="exit-survey-follow-up-search">
          Search
        </label>
        <input
          id="exit-survey-follow-up-search"
          type="search"
          className="input-field min-w-[200px] flex-1 px-3 py-2 text-sm"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search"
        />
        <DatePickerField
          label="From"
          value={filterFromDate}
          onChange={(v) => {
            setFilterFromDate(v);
            setListPage(0);
          }}
          className="w-[10.5rem] shrink-0"
        />
        <DatePickerField
          label="To"
          value={filterToDate}
          onChange={(v) => {
            setFilterToDate(v);
            setListPage(0);
          }}
          className="w-[10.5rem] shrink-0"
        />
        <SelectField
          label="User type"
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
        <SelectField
          label="Exit survey status"
          className="w-[10.5rem] shrink-0"
          value={filterSurveyStatus}
          onChange={(v) => {
            setFilterSurveyStatus(v === "COMPLETED" ? "COMPLETED" : "PENDING");
            setListPage(0);
          }}
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "COMPLETED", label: "Completed" },
          ]}
        />
        <button
          type="button"
          className="btn-ghost px-3 py-2 text-sm h-10 border border-wt-border rounded-lg"
          onClick={() => void loadFollowUpList()}
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
            {bulkResending ? "Sending…" : "Resend"}
          </button>
        ) : null}
      </div>

      {!loadingList && !rows.length ? (
        <p className="text-sm text-wt-text-muted">
          No employees in the exit survey follow-up window.
        </p>
      ) : rows.length ? (
        <>
          <div className="wt-scroll-both max-h-[min(60vh,480px)] rounded-xl border border-wt-border">
            <table className="wt-scrollable-table text-sm">
              <thead className="wt-table-sticky-head text-wt-text-muted">
                <tr>
                  <th className="w-10 px-3 py-2 font-medium">
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
                  </th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Name</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Email</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                    <TableSortHeader
                      label="Last Working Day"
                      sortable
                      activeDirection={activeSortDirectionForColumn(
                        "last_working_day",
                        lwdSortId,
                        EXIT_SURVEY_LWD_SORT_OPTIONS
                      )}
                      onSort={() =>
                        setLwdSortId((current) =>
                          toggleColumnSort("last_working_day", current, EXIT_SURVEY_LWD_SORT_OPTIONS)
                        )
                      }
                    />
                  </th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Survey</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const empId = resendableEmpIdFromRow(row);
                  const lookupId = followUpRowLookupId(row);
                  const canView = canViewExitSurveySubmission(row);
                  const canResend = isResendableFollowUpRow(row);
                  const isResending = Boolean(empId && resendingEmpId === empId);
                  const isSelected = Boolean(empId && selectedEmpIds.includes(empId));
                  const detailHref = lookupId ? exitInterviewSubmissionDetailPath(lookupId) : null;
                  const submitted =
                    row.submission_status === "SUBMITTED" || row.exit_survey_submitted === true;

                  return (
                    <tr
                      key={lookupId || empId || row.email}
                      className={`border-t border-wt-border hover:bg-wt-surface-2/50 ${
                        isSelected ? "bg-indigo-50/70" : ""
                      } ${canView && detailHref ? "cursor-pointer" : ""}`}
                      onClick={(event) => {
                        if (!canView || !detailHref) return;
                        const target = event.target as HTMLElement;
                        if (
                          target.closest("button, a, input, label, [data-no-row-nav]")
                        ) {
                          return;
                        }
                        router.push(detailHref);
                      }}
                    >
                      <td className="px-3 py-2" data-no-row-nav>
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
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {canView && detailHref ? (
                          <Link
                            href={detailHref}
                            className="font-medium text-indigo-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.employee_name || "—"}
                          </Link>
                        ) : (
                          row.employee_name || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.email || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {formatApiDateDisplay(row.last_working_day) || "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap" data-no-row-nav>
                        {submitted ? (
                          canView && detailHref ? (
                            <Link
                              href={detailHref}
                              className="text-xs font-medium text-indigo-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View responses
                            </Link>
                          ) : (
                            <span className="text-xs font-medium text-emerald-700">Submitted</span>
                          )
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs text-wt-text-muted">Pending</span>
                            {canResend ? (
                              <button
                                type="button"
                                className="btn-action px-2.5 py-1 text-xs"
                                disabled={loadingList || isResending || bulkResending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleResendExitSurvey(empId, row.email);
                                }}
                              >
                                {isResending ? "Sending…" : "Resend"}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
        <p className="text-sm text-wt-text-muted">
          No employees in the exit survey follow-up window.
        </p>
      )}
    </div>
  );
}
