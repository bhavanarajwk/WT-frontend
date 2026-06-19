"use client";

import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCheckbox,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import Link from "next/link";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
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
        showErrorToast(msg);
      }
    } catch (error) {
      setAllRows([]);
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load exit survey follow-up list.";
      showErrorToast(msg);
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


  const totalPages = Math.max(1, Math.ceil(listTotal / listPageSize) || 1);
  const rangeStart = listTotal === 0 ? 0 : listPage * listPageSize + 1;
  const rangeEnd = Math.min(listTotal, (listPage + 1) * listPageSize);

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

  return (
    <div className="space-y-4">

      <div className="flex flex-wrap items-end gap-3">
        <label className="sr-only" htmlFor="exit-survey-follow-up-search">
          Search
        </label>
        <Input
          id="exit-survey-follow-up-search"
          type="search"
          className="h-10 min-w-[200px] flex-1"
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
        <Button variant="outline" size="sm" type="button" className="px-3 py-2 text-sm h-10 border border-wt-border rounded-lg" onClick={() => void loadFollowUpList()}
          disabled={loadingList}
        >
          Refresh
        </Button>
        {selectedResendableCount > 0 ? (
          <Button variant="brand" size="sm" type="button" className="ml-auto px-3 py-2 text-sm h-10" disabled={loadingList || bulkResending || Boolean(resendingEmpId)} onClick={() => void handleBulkResendExitSurvey()}
          >
            {bulkResending ? "Sending…" : `Resend Exit Survey (${selectedResendableCount})`}
          </Button>
        ) : null}
      </div>

      {bulkResendResults.length ? (
        <div className="space-y-2 rounded-xl border border-wt-border bg-wt-surface-1 p-4">
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

      {!loadingList && !rows.length ? (
        <p className="text-sm text-wt-text-muted">
          No employees in the exit survey follow-up window.
        </p>
      ) : rows.length ? (
        <>
          <ScrollableTable maxHeightClass="max-h-[min(60vh,480px)]">
            <WtTable>
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
                      onCheckedChange={(checked) => toggleSelectAllOnPage(Boolean(checked))}
                      aria-label="Select all resendable employees on this page"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>
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
                  </TableHead>
                  <TableHead>Survey</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                    <TableRow
                      key={lookupId || empId || row.email}
                      className={`hover:bg-muted/50 ${
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
                      <TableCell className="px-3 py-2" data-no-row-nav>
                        {canResend ? (
                          <TableCheckbox
                            checked={isSelected}
                            disabled={loadingList || bulkResending || isResending}
                            onCheckedChange={(checked) =>
                              toggleRowSelection(empId, Boolean(checked))
                            }
                            aria-label={`Select ${row.employee_name || empId}`}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap">
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
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap">{row.email || "—"}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {formatApiDateDisplay(row.last_working_day) || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap" data-no-row-nav>
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
                              <Button variant="brand" size="xs" type="button" className="px-2.5 py-1 text-xs" disabled={loadingList || isResending || bulkResending} onClick={(e) => {
                                  e.stopPropagation();
                                  void handleResendExitSurvey(empId, row.email);
                                }}
                              >
                                {isResending ? "Sending…" : "Resend Exit Survey"}
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </WtTable>
          </ScrollableTable>
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
