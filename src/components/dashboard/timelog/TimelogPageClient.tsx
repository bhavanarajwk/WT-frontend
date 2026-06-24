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
import { HrEmployeeTimelogWeekModal } from "@/components/dashboard/timelog/HrEmployeeTimelogWeekModal";
import { HrMonthlyTimelogSummary } from "@/components/dashboard/timelog/HrMonthlyTimelogSummary";
import { MyWeeklyTimesheet } from "@/components/dashboard/timelog/MyWeeklyTimesheet";
import { WeeklyTimelogGrid } from "@/components/dashboard/timelog/WeeklyTimelogGrid";
import { WeekPickerField } from "@/components/dashboard/timelog/WeekPickerField";
import {
  currentMonthRef,
  type MonthRef,
} from "@/utils/timelog/monthWeeks";
import {
  useHrMonthlyTimelogSummary,
  type HrTimelogEmployee,
  type HrMonthlyTimelogRow,
} from "@/hooks/timelog/useHrMonthlyTimelogSummary";
import { HrReviewNoticeBanner } from "@/components/hr-review/HrReviewNoticeBanner";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import { isOffboardedUserStatus } from "@/utils/userStatus";
import { managerTeamEmails } from "@/utils/dashboard/projects";
import {
  gridRowsFromWeekSnapshot,
  submittedProjectCodesForDay,
  type TimelogWeekSnapshot,
} from "@/utils/timelog/gridState";
import {
  formatApiDate,
  normalizeWeekStart,
  weekDaysMonSun,
} from "@/utils/timelog/weekDates";

function unwrapPayload<T>(response: unknown): T {
  return ((response as { data?: T }).data ?? response) as T;
}

export function TimelogPageClient() {
  const pathname = usePathname();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasManagerAccess = roles.includes("ROLE_MANAGER");
  const hasHrAccess = roles.includes("ROLE_HR");
  const hasAdminAccess = roles.includes("ROLE_ADMIN");
  const hasAmRole = roles.includes("ROLE_AM");
  const isOffboarded = isOffboardedUserStatus(user?.status);
  const requiresSelfOnboarding = Boolean(user?.requiresSelfOnboarding);

  const subTab = pathname.includes("/dashboard/timelog/team") ? "team" : "my";
  const canSeeTeamTab = hasManagerAccess || hasHrAccess || hasAdminAccess;
  const isTeamView = subTab === "team";
  const canManagerApprove = isTeamView && (hasManagerAccess || hasAdminAccess) && !hasHrAccess;
  const isHrTeamView = isTeamView && hasHrAccess && !canManagerApprove;

  const [weekStart, setWeekStart] = useState(() => normalizeWeekStart(new Date()));
  const [weekSnapshot, setWeekSnapshot] = useState<TimelogWeekSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [teamEmployeeEmail, setTeamEmployeeEmail] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [hrMonth, setHrMonth] = useState<MonthRef>(() => currentMonthRef());
  const [hrWeekDetail, setHrWeekDetail] = useState<{
    email: string;
    label: string;
    weekStart: string;
  } | null>(null);

  const hrEmployees = useMemo<HrTimelogEmployee[]>(
    () => employeeOptions.map((opt) => ({ email: opt.value, label: opt.label })),
    [employeeOptions]
  );

  const hrMonthlySummary = useHrMonthlyTimelogSummary(hrEmployees, hrMonth, isHrTeamView);
  const hrMonthlyRows = useMemo(
    () =>
      hrMonthlySummary.rows.filter((row) =>
        Object.values(row.hoursByWeek).some((hours) => Number(hours) > 0)
      ),
    [hrMonthlySummary.rows]
  );

  const { toast, runAction } = useDashboardAction();

  const dayDates = useMemo(() => weekDaysMonSun(weekStart), [weekStart]);
  const dayKeys = useMemo(() => dayDates.map(formatApiDate), [dayDates]);

  const loadTeamWeek = useCallback(
    async (overrideEmail?: string) => {
      if (!isTeamView) return;
      const email = (overrideEmail ?? teamEmployeeEmail).trim().toLowerCase();
      if (!email) return;
      setLoading(true);
      try {
        const res = await hrmsService.getTimelogWeek({
          weekStart: formatApiDate(normalizeWeekStart(weekStart)),
          employeeEmail: email,
        });
        setWeekSnapshot(unwrapPayload<TimelogWeekSnapshot>(res));
      } finally {
        setLoading(false);
      }
    },
    [isTeamView, weekStart, teamEmployeeEmail]
  );

  const loadTeamEmployees = useCallback(async () => {
    const sortItems = (items: Array<{ value: string; label: string }>) =>
      items.sort((a, b) => a.label.localeCompare(b.label));

    if (hasHrAccess || (hasAdminAccess && !hasManagerAccess)) {
      const res = await hrmsService.getOnboardList({ page: "0", size: "500" });
      const rows = toPagedRows((res as { data?: unknown }).data ?? res);
      setEmployeeOptions(
        sortItems(
          rows
            .map((r) => {
              const email = String(r.email ?? "").trim().toLowerCase();
              const name = String(r.name ?? email).trim();
              return email ? { value: email, label: name || email } : null;
            })
            .filter((item): item is { value: string; label: string } => Boolean(item))
        )
      );
      return;
    }

    if (hasManagerAccess) {
      const res = await hrmsService.getManagerProjectsWithRoles();
      const portfolio = toPagedRows((res as { data?: unknown }).data ?? res);
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
        sortItems(Array.from(emails.entries()).map(([value, label]) => ({ value, label })))
      );
    }
  }, [hasHrAccess, hasAdminAccess, hasManagerAccess]);

  useEffect(() => {
    void loadTeamEmployees().catch(() => setEmployeeOptions([]));
  }, [loadTeamEmployees]);

  const teamGridRows = useMemo(() => {
    if (!weekSnapshot?.rows?.length) return [];
    return gridRowsFromWeekSnapshot(weekSnapshot, dayKeys);
  }, [weekSnapshot, dayKeys]);

  const approveDay = (logDate: string) =>
    void runAction("Approve timelog day", async () => {
      const email = teamEmployeeEmail.trim().toLowerCase();
      if (!email) throw new Error("Select an employee first.");
      const projects = submittedProjectCodesForDay(teamGridRows, logDate);
      if (!projects.length) throw new Error("No submitted entries for this day.");
      await Promise.all(
        projects.map((code) =>
          hrmsService.updateTimelogStatusBatch({
            employee_email: email,
            project_code: code,
            log_date: logDate,
            status: "APPROVED",
          })
        )
      );
      await loadTeamWeek();
    });

  const rejectDay = (logDate: string) => {
    const comment = window.prompt("Rejection comment (optional):");
    if (comment === null) return;
    void runAction("Reject timelog day", async () => {
      const email = teamEmployeeEmail.trim().toLowerCase();
      if (!email) throw new Error("Select an employee first.");
      const projects = submittedProjectCodesForDay(teamGridRows, logDate);
      if (!projects.length) throw new Error("No submitted entries for this day.");
      await Promise.all(
        projects.map((code) =>
          hrmsService.updateTimelogStatusBatch({
            employee_email: email,
            project_code: code,
            log_date: logDate,
            status: "REJECTED",
            manager_comment: comment.trim() || undefined,
          })
        )
      );
      await loadTeamWeek();
    });
  };

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

          {!isTeamView ? (
            <MyWeeklyTimesheet />
          ) : null}

          {isHrTeamView ? (
            <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
              <HrMonthlyTimelogSummary
                month={hrMonth}
                onMonthChange={setHrMonth}
                weekStarts={hrMonthlySummary.weekStarts}
                rows={hrMonthlyRows}
                loading={hrMonthlySummary.loading}
                error={hrMonthlySummary.error}
                onRefresh={() => void hrMonthlySummary.reload()}
                onRowClick={(row: HrMonthlyTimelogRow, weekStart: string) => {
                  setHrWeekDetail({ email: row.email, label: row.label, weekStart });
                }}
              />
            </section>
          ) : null}

          {isTeamView && !isHrTeamView ? (
            <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Team timelogs</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <WeekPickerField weekStart={weekStart} onWeekStartChange={setWeekStart} disabled={loading} />
                  <button
                    type="button"
                    className="btn-ghost px-3 py-2 text-sm border border-wt-border rounded-lg"
                    disabled={loading}
                    onClick={() => void loadTeamWeek()}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {canManagerApprove ? (
                <p className="text-xs text-wt-text-muted">
                  Review submitted entries below. Approve or reject each day; rejected entries return to the employee
                  as drafts.
                </p>
              ) : null}

              <SelectField
                label="Employee"
                required
                className="max-w-md"
                value={teamEmployeeEmail}
                onChange={(v) => {
                  setTeamEmployeeEmail(v);
                  setWeekSnapshot(null);
                  void loadTeamWeek(v);
                }}
                placeholder="Select employee"
                options={employeeOptions}
              />

              {loading ? (
                <p className="text-sm text-wt-text-muted py-8 text-center">Loading timelogs\u2026</p>
              ) : !teamEmployeeEmail.trim() ? (
                <p className="text-sm text-wt-text-muted py-8 text-center">Select an employee to view their timelogs.</p>
              ) : !weekSnapshot?.rows?.length ? (
                <p className="text-sm text-wt-text-muted py-8 text-center">No submitted timelog entries for this week.</p>
              ) : (
                <WeeklyTimelogGrid
                  rows={teamGridRows}
                  dayDates={dayDates}
                  dayKeys={dayKeys}
                  projectOptions={[]}
                  readOnly
                  canApprove={canManagerApprove}
                  onApproveDay={canManagerApprove ? approveDay : undefined}
                  onRejectDay={canManagerApprove ? rejectDay : undefined}
                  onRowsChange={() => {}}
                />
              )}
            </section>
          ) : null}
        </div>
        <DashboardToast toast={toast} />
        {isHrTeamView && hrWeekDetail ? (
          <HrEmployeeTimelogWeekModal
            open
            employeeEmail={hrWeekDetail.email}
            employeeLabel={hrWeekDetail.label}
            weekStart={hrWeekDetail.weekStart}
            weekStarts={hrMonthlySummary.weekStarts}
            onWeekStartChange={(weekStart) =>
              setHrWeekDetail((prev) => (prev ? { ...prev, weekStart } : prev))
            }
            onClose={() => setHrWeekDetail(null)}
          />
        ) : null}
      </DashboardPageShell>
    </OnboardingGate>
  );
}
