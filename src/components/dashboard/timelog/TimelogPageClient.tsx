"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { SelectField } from "@/components/dashboard/ui/forms";
import { WeeklyTimelogGrid } from "@/components/dashboard/timelog/WeeklyTimelogGrid";
import { WeekPickerField } from "@/components/dashboard/timelog/WeekPickerField";
import { HrReviewNoticeBanner } from "@/components/hr-review/HrReviewNoticeBanner";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import { isOffboardedUserStatus } from "@/utils/userStatus";
import { managerTeamEmails } from "@/utils/dashboard/projects";
import {
  projectOptionsFromPayload,
  type TimelogOptionsPayload,
} from "@/utils/timelog/categories";
import {
  createEmptyGridRow,
  gridRowsFromWeekSnapshot,
  type TimelogGridRow,
  type TimelogWeekSnapshot,
  weekPayloadFromGridRows,
} from "@/utils/timelog/gridState";
import {
  formatApiDate,
  normalizeWeekStart,
  weekDaysMonFri,
} from "@/utils/timelog/weekDates";

function unwrapPayload<T>(response: unknown): T {
  return ((response as { data?: T }).data ?? response) as T;
}

export function TimelogPageClient() {
  const pathname = usePathname();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasManagerAccess = roles.includes("ROLE_MANAGER");
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");
  const hasAmRole = roles.includes("ROLE_AM");
  const isOffboarded = isOffboardedUserStatus(user?.status);
  const requiresSelfOnboarding = Boolean(user?.requiresSelfOnboarding);

  const subTab = pathname.includes("/dashboard/timelog/team") ? "team" : "my";
  const canSeeTeamTab = hasManagerAccess || hasHrAccess;

  const [weekStart, setWeekStart] = useState(() => normalizeWeekStart(new Date()));
  const [options, setOptions] = useState<TimelogOptionsPayload | null>(null);
  const [rows, setRows] = useState<TimelogGridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamEmployeeEmail, setTeamEmployeeEmail] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ value: string; label: string }>>([]);

  const { toast, actionLoading, runAction, setToast } = useDashboardAction();

  const dayDates = useMemo(() => weekDaysMonFri(weekStart), [weekStart]);
  const dayKeys = useMemo(() => dayDates.map(formatApiDate), [dayDates]);
  const projectOptions = useMemo(() => projectOptionsFromPayload(options), [options]);

  const targetEmail = subTab === "team" && teamEmployeeEmail.trim() ? teamEmployeeEmail.trim() : undefined;
  const readOnly = subTab === "team" && !targetEmail;

  const loadOptions = useCallback(async () => {
    const res = await hrmsService.getTimelogOptions();
    setOptions(unwrapPayload<TimelogOptionsPayload>(res));
  }, []);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrmsService.getTimelogWeek({
        weekStart: formatApiDate(normalizeWeekStart(weekStart)),
        employeeEmail: targetEmail,
      });
      const snapshot = unwrapPayload<TimelogWeekSnapshot>(res);
      setRows(gridRowsFromWeekSnapshot(snapshot, dayKeys));
    } finally {
      setLoading(false);
    }
  }, [weekStart, targetEmail, dayKeys]);

  const loadTeamEmployees = useCallback(async () => {
    if (!canSeeTeamTab) return;
    if (hasManagerAccess) {
      const portfolioRes = await hrmsService.getManagerProjectsWithRoles();
      const portfolio = toPagedRows((portfolioRes as { data?: unknown }).data ?? portfolioRes);
      const emails = new Map<string, string>();
      for (const row of portfolio) {
        const nested = Array.isArray(row.employees)
          ? (row.employees as Array<Record<string, unknown>>)
          : [];
        for (const emp of nested) {
          const email = String(emp.email ?? emp.user_email ?? emp.userEmail ?? "").trim().toLowerCase();
          const name = String(emp.name ?? email).trim();
          if (email) emails.set(email, name || email);
        }
      }
      for (const email of managerTeamEmails(portfolio)) {
        if (!emails.has(email)) emails.set(email, email);
      }
      setEmployeeOptions(
        Array.from(emails.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label))
      );
      return;
    }
    const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "500" });
    const onboardRows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
    setEmployeeOptions(
      onboardRows
        .map((row) => {
          const email = String(row.email ?? "").trim().toLowerCase();
          const name = String(row.name ?? email).trim();
          return email ? { value: email, label: name ? `${name} (${email})` : email } : null;
        })
        .filter((item): item is { value: string; label: string } => Boolean(item))
        .sort((a, b) => a.label.localeCompare(b.label))
    );
  }, [canSeeTeamTab, hasManagerAccess]);

  useEffect(() => {
    void loadOptions().catch(() => setOptions(null));
  }, [loadOptions]);

  useEffect(() => {
    void loadTeamEmployees().catch(() => setEmployeeOptions([]));
  }, [loadTeamEmployees]);

  useEffect(() => {
    if (subTab === "team" && !teamEmployeeEmail.trim()) {
      setRows([createEmptyGridRow(dayKeys)]);
      return;
    }
    void loadWeek().catch((error) => {
      setRows([createEmptyGridRow(dayKeys)]);
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to load timelog week",
      });
    });
  }, [subTab, teamEmployeeEmail, loadWeek, dayKeys, setToast]);

  const saveWeek = () =>
    void runAction("Save timelog", async () => {
      const payload = {
        week_start: formatApiDate(normalizeWeekStart(weekStart)),
        employee_email: targetEmail ?? undefined,
        rows: weekPayloadFromGridRows(rows, dayKeys),
      };
      await hrmsService.saveTimelogWeek(payload);
      await loadWeek();
    });

  const updateEntryStatus = (entryId: number, status: "APPROVED" | "REJECTED") =>
    void runAction(status === "APPROVED" ? "Approve entry" : "Reject entry", async () => {
      await hrmsService.updateTimelogStatus({ timelog_id: entryId, status });
      await loadWeek();
    });

  if (isOffboarded) {
    return (
      <DashboardPageShell>
        <p className="text-sm text-wt-text-muted">Timelog access is not available for offboarded users.</p>
      </DashboardPageShell>
    );
  }

  return (
    <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
      <DashboardPageShell>
        <div className="space-y-6">
          {hasAmRole ? <HrReviewNoticeBanner /> : null}

          {canSeeTeamTab ? (
            <div className="flex flex-wrap gap-2 border-b border-wt-border pb-2">
              <Link
                href="/dashboard/timelog"
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  subTab === "my" ? "bg-wt-surface-3 text-wt-text" : "text-wt-text-muted hover:bg-wt-surface-2"
                }`}
              >
                My timelogs
              </Link>
              <Link
                href="/dashboard/timelog/team"
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  subTab === "team" ? "bg-wt-surface-3 text-wt-text" : "text-wt-text-muted hover:bg-wt-surface-2"
                }`}
              >
                Team timelogs
              </Link>
            </div>
          ) : null}

          <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">
                {subTab === "team" ? "Team weekly timesheet" : "My weekly timesheet"}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <WeekPickerField weekStart={weekStart} onWeekStartChange={setWeekStart} disabled={loading} />
                <button
                  type="button"
                  className="btn-ghost px-3 py-2 text-sm border border-wt-border rounded-lg"
                  disabled={loading}
                  onClick={() => void loadWeek()}
                >
                  Refresh
                </button>
                {!readOnly ? (
                  <button
                    type="button"
                    className="btn-primary px-4 py-2 text-sm"
                    disabled={actionLoading || loading}
                    onClick={saveWeek}
                  >
                    {actionLoading ? "Saving…" : "Save week"}
                  </button>
                ) : null}
              </div>
            </div>

            {subTab === "team" ? (
              <SelectField
                label="Employee"
                required
                className="max-w-md"
                value={teamEmployeeEmail}
                onChange={setTeamEmployeeEmail}
                placeholder="Select employee"
                options={employeeOptions}
              />
            ) : null}

            {loading ? (
              <p className="text-sm text-wt-text-muted py-8 text-center">Loading timesheet…</p>
            ) : subTab === "team" && !teamEmployeeEmail.trim() ? (
              <p className="text-sm text-wt-text-muted py-8 text-center">Select an employee to view their weekly timesheet.</p>
            ) : (
              <WeeklyTimelogGrid
                rows={rows}
                dayDates={dayDates}
                dayKeys={dayKeys}
                projectOptions={projectOptions}
                readOnly={readOnly}
                onRowsChange={setRows}
                canApprove={subTab === "team" && (hasManagerAccess || hasHrAccess)}
                onApproveEntry={(id) => updateEntryStatus(id, "APPROVED")}
                onRejectEntry={(id) => updateEntryStatus(id, "REJECTED")}
              />
            )}
          </section>
        </div>
        <DashboardToast toast={toast} />
      </DashboardPageShell>
    </OnboardingGate>
  );
}
