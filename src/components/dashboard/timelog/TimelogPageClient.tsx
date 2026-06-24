"use client";

import { Button } from "@/components/ui/button";
import { PageTabs, PAGE_TAB_BODY_CLASS } from "@/components/dashboard/ui/PageTabs";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { showErrorToast } from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { SelectField } from "@/components/dashboard/ui/forms";
import { HrEmployeeTimelogWeekModal } from "@/components/dashboard/timelog/HrEmployeeTimelogWeekModal";
import { HrMonthlyTimelogSummary } from "@/components/dashboard/timelog/HrMonthlyTimelogSummary";
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
  projectOptionsFromPayload,
  type TimelogOptionsPayload,
} from "@/utils/timelog/categories";
import {
  createEmptyGridRow,
  gridRowsFromWeekSnapshot,
  hasSubmittableEntries,
  submittedProjectCodesForDay,
  type TimelogGridRow,
  type TimelogWeekSnapshot,
  weekPayloadFromGridRows,
} from "@/utils/timelog/gridState";
import { ApiError } from "@/api/error";
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
  const router = useRouter();
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
  const canManagerApprove =
    isTeamView && (hasManagerAccess || hasAdminAccess) && !hasHrAccess;
  const isHrTeamView = isTeamView && hasHrAccess && !canManagerApprove;

  const [weekStart, setWeekStart] = useState(() => normalizeWeekStart(new Date()));
  const [options, setOptions] = useState<TimelogOptionsPayload | null>(null);
  const [rows, setRows] = useState<TimelogGridRow[]>([]);
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

  const { actionLoading, runAction } = useDashboardAction();

  const dayDates = useMemo(() => weekDaysMonSun(weekStart), [weekStart]);
  const dayKeys = useMemo(() => dayDates.map(formatApiDate), [dayDates]);
  const projectOptions = useMemo(() => projectOptionsFromPayload(options), [options]);
  const teamGridRows = useMemo(() => {
    if (!isTeamView || !weekSnapshot?.rows?.length) return [];
    return gridRowsFromWeekSnapshot(weekSnapshot, dayKeys);
  }, [isTeamView, weekSnapshot, dayKeys]);

  const targetEmail =
    isTeamView && teamEmployeeEmail.trim() ? teamEmployeeEmail.trim().toLowerCase() : undefined;

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
      setWeekSnapshot(snapshot);
      if (!isTeamView) {
        setRows(gridRowsFromWeekSnapshot(snapshot, dayKeys));
      }
    } finally {
      setLoading(false);
    }
  }, [weekStart, targetEmail, dayKeys, isTeamView]);

  const loadTeamEmployees = useCallback(async () => {
    if (!canSeeTeamTab) return;

    const sortEmployeeOptions = (items: Array<{ value: string; label: string }>) =>
      items.sort((a, b) => a.label.localeCompare(b.label));

    if (hasHrAccess || (hasAdminAccess && !hasManagerAccess)) {
      const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "500" });
      const onboardRows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
      setEmployeeOptions(
        sortEmployeeOptions(
          onboardRows
            .map((row) => {
              const email = String(row.email ?? "").trim().toLowerCase();
              const name = String(row.name ?? email).trim();
              return email ? { value: email, label: name || email } : null;
            })
            .filter((item): item is { value: string; label: string } => Boolean(item))
        )
      );
      return;
    }

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
        sortEmployeeOptions(Array.from(emails.entries()).map(([value, label]) => ({ value, label })))
      );
    }
  }, [canSeeTeamTab, hasHrAccess, hasAdminAccess, hasManagerAccess]);

  useEffect(() => {
    void loadOptions().catch(() => setOptions(null));
  }, [loadOptions]);

  useEffect(() => {
    void loadTeamEmployees().catch(() => setEmployeeOptions([]));
  }, [loadTeamEmployees]);

  useEffect(() => {
    if (isHrTeamView) return;

    if (isTeamView && !teamEmployeeEmail.trim()) {
      setWeekSnapshot(null);
      return;
    }
    if (!isTeamView) {
      void loadWeek().catch((error) => {
        setWeekSnapshot(null);
        setRows([createEmptyGridRow(dayKeys)]);
        showErrorToast(error instanceof Error ? error.message : "Unable to load timelog week");
      });
      return;
    }
    void loadWeek().catch((error) => {
      setWeekSnapshot(null);
      showErrorToast(error instanceof Error ? error.message : "Unable to load timelog week");
    });
  }, [isTeamView, isHrTeamView, subTab, teamEmployeeEmail, loadWeek, dayKeys]);

  const saveWeek = () =>
    void runAction("Save timelog draft", async () => {
      const payloadRows = weekPayloadFromGridRows(rows, dayKeys);
      if (!payloadRows.length) {
        throw new Error("Add at least one draft entry before saving.");
      }
      await hrmsService.saveTimelogWeek({
        week_start: formatApiDate(normalizeWeekStart(weekStart)),
        rows: payloadRows,
      });
      await loadWeek();
    });

  const submitWeek = () =>
    void runAction("Submit timelog to manager", async () => {
      const week_start = formatApiDate(normalizeWeekStart(weekStart));
      const payloadRows = weekPayloadFromGridRows(rows, dayKeys);
      if (payloadRows.length) {
        await hrmsService.saveTimelogWeek({ week_start, rows: payloadRows });
      } else if (!hasSubmittableEntries(rows, dayKeys)) {
        throw new Error("Save draft hours before submitting to your manager.");
      }
      try {
        await hrmsService.submitTimelogWeek({ week_start });
      } catch (error) {
        if (error instanceof ApiError && error.message.includes("NO_DRAFT_ENTRIES")) {
          throw new Error("Nothing to submit. Save draft hours first.");
        }
        throw error;
      }
      await loadWeek();
    });

  const approveDay = (logDate: string) =>
    void runAction("Approve timelog day", async () => {
      const email = teamEmployeeEmail.trim().toLowerCase();
      if (!email) throw new Error("Select an employee first.");
      const projects = submittedProjectCodesForDay(teamGridRows, logDate);
      if (!projects.length) throw new Error("No submitted entries for this day.");
      await Promise.all(
        projects.map((project_code) =>
          hrmsService.updateTimelogStatusBatch({
            employee_email: email,
            project_code,
            log_date: logDate,
            status: "APPROVED",
          })
        )
      );
      await loadWeek();
    });

  const rejectDay = (logDate: string) => {
    const manager_comment = window.prompt("Rejection comment (optional):");
    if (manager_comment === null) return;
    void runAction("Reject timelog day", async () => {
      const email = teamEmployeeEmail.trim().toLowerCase();
      if (!email) throw new Error("Select an employee first.");
      const projects = submittedProjectCodesForDay(teamGridRows, logDate);
      if (!projects.length) throw new Error("No submitted entries for this day.");
      await Promise.all(
        projects.map((project_code) =>
          hrmsService.updateTimelogStatusBatch({
            employee_email: email,
            project_code,
            log_date: logDate,
            status: "REJECTED",
            manager_comment: manager_comment.trim() || undefined,
          })
        )
      );
      await loadWeek();
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

          <section className="rounded-2xl border border-wt-border bg-wt-surface-1">
            {canSeeTeamTab ? (
              <PageTabs
                embedded
                aria-label="Timelog views"
                value={subTab}
                onValueChange={(value) => {
                  router.push(value === "team" ? "/dashboard/timelog/team" : "/dashboard/timelog");
                }}
                items={[
                  { value: "my", label: "My Timelogs" },
                  { value: "team", label: "Team Timelogs" },
                ]}
              />
            ) : null}
            <div className={PAGE_TAB_BODY_CLASS}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">
                {isHrTeamView ? "Approved timelog hours" : isTeamView ? "Team timelogs" : "My weekly timesheet"}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {!isHrTeamView ? (
                  <WeekPickerField weekStart={weekStart} onWeekStartChange={setWeekStart} disabled={loading} />
                ) : null}
                {!isHrTeamView ? (
                  <Button variant="outline" size="sm" type="button" className="px-3 py-2 text-sm border border-wt-border rounded-lg" disabled={loading} onClick={() => void loadWeek()}
                  >
                    Refresh
                  </Button>
                ) : null}
                {!isTeamView ? (
                  <>
                    <Button variant="outline" size="sm" type="button" className="px-4 py-2 text-sm border border-wt-border rounded-lg" disabled={actionLoading || loading} onClick={saveWeek} >
                      {actionLoading ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="brand" size="sm" type="button" className="px-4 py-2 text-sm" disabled={actionLoading || loading} onClick={submitWeek} >
                      {actionLoading ? "Submitting…" : "Submit"}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            {!isTeamView ? (
              <p className="text-xs text-wt-text-muted">
                <span className="font-medium text-wt-text">Save</span> keeps drafts visible only to you.{" "}
                <span className="font-medium text-wt-text">Submit</span> sends draft and rejected entries to your
                manager for approval.
              </p>
            ) : null}

            {isTeamView && canManagerApprove ? (
              <p className="text-xs text-wt-text-muted">
                Review submitted entries below. Approve or reject each day; rejected entries return to the employee
                as drafts.
              </p>
            ) : null}

            {isHrTeamView ? (
              <p className="text-xs text-wt-text-muted">
                Approved weekly hours for all employees. Click a row or week hours to view details. Use
                previous/next month to navigate.
              </p>
            ) : null}

            {isTeamView && !isHrTeamView ? (
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

            {isHrTeamView ? (
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
            ) : loading ? (
              <p className="text-sm text-wt-text-muted py-8 text-center">
                {isTeamView ? "Loading timelogs…" : "Loading timesheet…"}
              </p>
            ) : isTeamView && !teamEmployeeEmail.trim() ? (
              <p className="text-sm text-wt-text-muted py-8 text-center">
                Select an employee to view their timelogs.
              </p>
            ) : isTeamView && !weekSnapshot?.rows?.length ? (
              <p className="text-sm text-wt-text-muted py-8 text-center">
                No submitted timelog entries for this week.
              </p>
            ) : (
              <WeeklyTimelogGrid
                rows={isTeamView ? teamGridRows : rows}
                dayDates={dayDates}
                dayKeys={dayKeys}
                projectOptions={projectOptions}
                readOnly={isTeamView}
                canApprove={canManagerApprove}
                onApproveDay={canManagerApprove ? approveDay : undefined}
                onRejectDay={canManagerApprove ? rejectDay : undefined}
                onRowsChange={isTeamView ? () => {} : setRows}
              />
            )}
            </div>
          </section>
        </div>
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
