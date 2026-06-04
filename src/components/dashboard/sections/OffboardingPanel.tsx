"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import type { OffboardListItem } from "@/types/offboard";
import { DatePickerField, InputField, SelectField } from "@/components/dashboard/ui/forms";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
import { toPagedRows } from "@/utils/apiRows";
import { formatApiDateDisplay } from "@/utils/apiDate";
import {
  createEmptyOffboardingForm,
  type ExitType,
} from "@/utils/offboardingFormState";

type Toast = { type: "success" | "error"; message: string } | null;

type OffboardCandidate = { emp_id: string; name: string; email: string };

const DEFAULT_PAGE_SIZE = 10;

const USER_TYPE_FILTER_OPTIONS = ["", "FULLTIME", "INTERN", "CONSULTANT"] as const;

function formatBool(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatExitType(value: string): string {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "VOLUNTARY") return "Voluntary";
  if (v === "INVOLUNTARY") return "Involuntary";
  return v || "—";
}

export function OffboardingPanel() {
  const [offboardingForm, setOffboardingForm] = useState(createEmptyOffboardingForm);
  const [offboardCandidates, setOffboardCandidates] = useState<OffboardCandidate[]>([]);
  const [offboardedRows, setOffboardedRows] = useState<OffboardListItem[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(0);
  const [listPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterType, setFilterType] = useState("");

  const [loadingList, setLoadingList] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const loadOffboardList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await hrmsService.getOffboardList({
        page: listPage,
        size: listPageSize,
        search: appliedSearch.trim() || undefined,
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
  }, [listPage, listPageSize, appliedSearch, filterType, filterFromDate, filterToDate]);

  const loadOffboardCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const [onboardRes, offboardRes] = await Promise.all([
        hrmsService.getOnboardList({ page: "0", size: "500" }),
        hrmsService.getOffboardList({ page: 0, size: 200 }),
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
              if (status === "INACTIVE") return null;
              const name = String(row.name ?? "—").trim() || "—";
              const email = String(row.email ?? "—").trim() || "—";
              return [emp_id.toLowerCase(), { emp_id, name, email }] as const;
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
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
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
      return "Resignation date must be on or before last working day.";
    }
    const days = Math.round((b.getTime() - a.getTime()) / 86400000);
    return `Notice period (resignation → last working day): ${Math.max(0, days)} calendar day(s).`;
  }, [offboardingForm.resignation_date, offboardingForm.last_working_day]);

  function applyListFilters() {
    setListPage(0);
    setAppliedSearch(searchInput.trim());
  }

  async function submitOffboarding() {
    const empIdValue = offboardingForm.emp_id.trim();
    if (!empIdValue) {
      setToast({ type: "error", message: "Please select an employee." });
      return;
    }
    const resignationDate = offboardingForm.resignation_date.trim();
    if (!resignationDate) {
      setToast({ type: "error", message: "Please select resignation date." });
      return;
    }
    if (!offboardingForm.exit_type) {
      setToast({ type: "error", message: "Please select exit type." });
      return;
    }
    const lastWorkingDay = offboardingForm.last_working_day.trim();
    setSubmitting(true);
    setToast(null);
    try {
      await hrmsService.offboardEmployee(empIdValue, {
        resignation_date: resignationDate,
        exit_type: offboardingForm.exit_type,
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
        search: appliedSearch.trim() || undefined,
        type: filterType.trim() || undefined,
        fromDate: filterFromDate.trim() || undefined,
        toDate: filterToDate.trim() || undefined,
      });
      setOffboardedRows(res.data?.items ?? []);
      setListTotal(res.data?.total ?? 0);
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

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <h3 className="font-semibold mb-4">Employee offboarding</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <SelectField
            label="Employee"
            required
            disabled={loadingCandidates}
            placeholder={
              loadingCandidates
                ? "Loading employees…"
                : candidateOptions.length
                  ? "Select employee"
                  : "No active employees available"
            }
            value={offboardingForm.emp_id}
            onChange={(emp_id) => setOffboardingForm((p) => ({ ...p, emp_id }))}
            options={candidateOptions}
          />
          <InputField
            label="Resignation date"
            required
            type="date"
            value={offboardingForm.resignation_date}
            onChange={(v) => setOffboardingForm((p) => ({ ...p, resignation_date: v }))}
          />
          <InputField
            label="Last working day"
            type="date"
            value={offboardingForm.last_working_day}
            onChange={(v) => setOffboardingForm((p) => ({ ...p, last_working_day: v }))}
          />
          <SelectField
            label="Exit type"
            required
            placeholder="Select exit type"
            value={offboardingForm.exit_type}
            options={["VOLUNTARY", "INVOLUNTARY"]}
            onChange={(v) =>
              setOffboardingForm((p) => ({
                ...p,
                exit_type: v === "INVOLUNTARY" || v === "VOLUNTARY" ? (v as ExitType) : "",
              }))
            }
          />
          <InputField
            label="Reason"
            value={offboardingForm.reason}
            onChange={(v) => setOffboardingForm((p) => ({ ...p, reason: v }))}
          />
          <InputField
            label="Critical skill"
            value={offboardingForm.critical_skill}
            onChange={(v) => setOffboardingForm((p) => ({ ...p, critical_skill: v }))}
          />
          <label className="text-xs text-wt-text-muted flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={offboardingForm.is_regretted}
              onChange={(e) =>
                setOffboardingForm((p) => ({ ...p, is_regretted: e.target.checked }))
              }
            />
            Is regretted
          </label>
        </div>
        {offboardingNoticeLabel ? (
          <p className="text-sm text-wt-text-muted mt-2">{offboardingNoticeLabel}</p>
        ) : null}
        <div className="mt-4">
          <button
            type="button"
            className="btn-primary px-3 py-2 text-sm"
            disabled={submitting || loadingCandidates}
            onClick={() => void submitOffboarding()}
          >
            {submitting ? "Submitting…" : "Submit offboarding"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Offboarded employees</h3>
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
            placeholder="Search by name, emp id, or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyListFilters();
            }}
            aria-label="Search offboarded employees"
          />
          <DatePickerField
            label="LWD from"
            value={filterFromDate}
            onChange={setFilterFromDate}
            className="w-[10.5rem] shrink-0"
          />
          <DatePickerField
            label="LWD to"
            value={filterToDate}
            onChange={setFilterToDate}
            className="w-[10.5rem] shrink-0"
          />
          <SelectField
            label="User type"
            className="w-[10.5rem] shrink-0"
            value={filterType}
            onChange={setFilterType}
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
            className="btn-primary px-3 py-2 text-sm h-10"
            onClick={applyListFilters}
            disabled={loadingList}
          >
            Apply
          </button>
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
          <p className="text-sm text-wt-text-muted">Loading offboarded employees…</p>
        ) : offboardedRows.length ? (
          <>
            <div className="wt-scroll-both max-h-[min(60vh,480px)] rounded-xl border border-wt-border">
              <table className="min-w-full text-sm">
                <thead className="bg-wt-surface-2 text-wt-text-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Name</th>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Status</th>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Exit type</th>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Resignation</th>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Last working day</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Notice (days)</th>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Designation</th>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Band</th>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Regretted</th>
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
          <p className="text-sm text-wt-text-muted">No offboarded employees found.</p>
        )}
      </div>
    </section>
  );
}
