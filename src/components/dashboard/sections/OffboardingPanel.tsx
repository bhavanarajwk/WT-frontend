"use client";

import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import { InputField, SelectField } from "@/components/dashboard/ui/forms";
import { toPagedRows } from "@/utils/apiRows";
import {
  createEmptyOffboardingForm,
  type ExitType,
} from "@/utils/offboardingFormState";
import { normalizeEmployeeStatusKey } from "@/utils/userStatus";

type Toast = { type: "success" | "error"; message: string } | null;

type OffboardCandidate = { emp_id: string; name: string; email: string };

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

export function OffboardingPanel() {
  const [offboardingForm, setOffboardingForm] = useState(createEmptyOffboardingForm);
  const [offboardCandidates, setOffboardCandidates] = useState<OffboardCandidate[]>([]);

  const [fyStartYear, setFyStartYear] = useState(defaultFinancialYearStart);
  const [attritionPercent, setAttritionPercent] = useState<number | null>(null);
  const [voluntaryPercent, setVoluntaryPercent] = useState<number | null>(null);
  const [involuntaryPercent, setInvoluntaryPercent] = useState<number | null>(null);
  const [attritionExitCount, setAttritionExitCount] = useState<number | null>(null);
  const [loadingAttrition, setLoadingAttrition] = useState(false);

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
              if (
                status === "INACTIVE" ||
                normalizeEmployeeStatusKey(status) === "IN_NOTICE"
              ) {
                return null;
              }
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
    void loadAttritionSummary();
  }, [loadAttritionSummary]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

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
      setToast({ type: "success", message: "Employee offboarded successfully." });
      await loadOffboardCandidates();
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-semibold">Attrition Summary</h3>
            <p className="text-xs text-wt-text-muted mt-1">
              Financial-year exit metrics (Apr–Mar)
              {attritionExitCount != null ? ` · ${attritionExitCount} exit(s)` : ""}
            </p>
          </div>
          <SelectField
            label="Financial year (start)"
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

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <h3 className="font-semibold mb-4">Employee Offboarding</h3>
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
    </section>
  );
}
