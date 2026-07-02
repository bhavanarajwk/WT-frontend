"use client";

import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { ContentCard } from "@/components/dashboard/ui/ContentCard";
import { PageSectionHeader } from "@/components/dashboard/ui/PageSectionHeader";
import { PageTabs, PAGE_TAB_BODY_CLASS } from "@/components/dashboard/ui/PageTabs";
import { INNER_PANEL_CLASS } from "@/components/dashboard/ui/uiLayout";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { SelectField } from "@/components/dashboard/ui/forms";
import { ApprovalRemarkModal } from "@/components/dashboard/timelog/ApprovalRemarkModal/ApprovalRemarkModal";
import { HrEmployeeTimelogWeekModal } from "@/components/dashboard/timelog/HrEmployeeTimelogWeekModal";
import { HrMonthlyTimelogSummary } from "@/components/dashboard/timelog/HrMonthlyTimelogSummary";
import { MyWeeklyTimesheet } from "@/components/dashboard/timelog/MyWeeklyTimesheet";
import { ProjectTimelogPanel } from "@/components/dashboard/timelog/ProjectTimelogPanel/ProjectTimelogPanel";
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
import { WtLoader, WtLoaderCentered } from "@/components/dashboard/ui/WtLoader";
import { HrReviewNoticeBanner } from "@/components/hr-review/HrReviewNoticeBanner";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import { isOffboardedUserStatus } from "@/utils/userStatus";
import { managerTeamEmails } from "@/utils/dashboard/projects";
import { TASK_CATEGORY_LABELS } from "@/utils/timelog/categories";
import {
  formatApiDate,
  normalizeWeekStart,
  weekDaysMonSun,
} from "@/utils/timelog/weekDates";
import type { DayTimelogEntry } from "@/hooks/timelog/useDayTimelog.types";

function unwrapPayload<T>(response: unknown): T {
  return ((response as { data?: T }).data ?? response) as T;
}

function entryStatusClass(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "rounded-md bg-wt-surface-3 px-2 py-0.5 text-xs font-medium text-wt-text-muted",
    SUBMITTED: "rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300",
    APPROVED: "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300",
    REJECTED: "rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300",
  };
  return map[status] ?? map.DRAFT;
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

  const subTab = pathname.endsWith("/dashboard/timelog/team") ? "team" : pathname.endsWith("/dashboard/timelog/projects") ? "projects" : "my";
  const canSeeTeamTab = hasManagerAccess || hasHrAccess || hasAdminAccess;
  const isTeamView = subTab === "team";
  const isProjectView = subTab === "projects";
  const canManagerApprove = isTeamView && (hasManagerAccess || hasAdminAccess) && !hasHrAccess;
  const isHrTeamView = isTeamView && hasHrAccess && !canManagerApprove;

  const [weekStart, setWeekStart] = useState(() => normalizeWeekStart(new Date()));
  const [employeeEntries, setEmployeeEntries] = useState<DayTimelogEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [teamEmployeeEmail, setTeamEmployeeEmail] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [hrMonth, setHrMonth] = useState<MonthRef>(() => currentMonthRef());
  const [hrWeekDetail, setHrWeekDetail] = useState<{
    email: string;
    label: string;
    weekStart: string;
  } | null>(null);
  const [remarkAction, setRemarkAction] = useState<{
    entryId: number;
    action: "APPROVED" | "REJECTED";
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

  const { runAction } = useDashboardAction();

  const dayDates = useMemo(() => weekDaysMonSun(weekStart), [weekStart]);

  const loadEmployeeEntries = useCallback(
    async (overrideEmail?: string) => {
      if (!isTeamView) return;
      const email = (overrideEmail ?? teamEmployeeEmail).trim().toLowerCase();
      if (!email) return;
      const startDate = formatApiDate(dayDates[0]);
      const endDate = formatApiDate(dayDates[dayDates.length - 1]);
      setEntriesLoading(true);
      try {
        const res = await hrmsService.getTimelogEmployeeEntries({
          employeeEmail: email,
          startDate,
          endDate,
        });
        const data = unwrapPayload<DayTimelogEntry[]>(res);
        setEmployeeEntries(Array.isArray(data) ? data : []);
      } catch {
        setEmployeeEntries([]);
      } finally {
        setEntriesLoading(false);
      }
    },
    [isTeamView, teamEmployeeEmail, dayDates]
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

  const handleEntryRemarkConfirm = (remark: string) => {
    const action = remarkAction;
    if (!action) return;
    setRemarkAction(null);
    void runAction(action.action === "APPROVED" ? "Approve Time Log" : "Reject Time Log", async () => {
      await hrmsService.updateTimelogStatus({
        timelog_id: action.entryId,
        status: action.action,
        manager_comment: remark || undefined,
      });
      await loadEmployeeEntries();
    });
  };

  useEffect(() => {
    if ((isTeamView || isProjectView) && !canSeeTeamTab) {
      router.replace("/dashboard/timelog");
    }
  }, [isTeamView, isProjectView, canSeeTeamTab, router]);

  const timelogTabItems = useMemo(
    () => [
      { value: "my", label: "My Time Logs" },
      { value: "projects", label: "Team Time Logs" },
    ],
    []
  );

  if (isOffboarded) {
    return (
      <DashboardPageShell>
        <p className="text-sm text-wt-text-muted">Time Log access is not available for offboarded users.</p>
      </DashboardPageShell>
    );
  }

  if ((isTeamView || isProjectView) && !canSeeTeamTab) {
    return (
      <DashboardPageShell>
        <p className="text-sm text-wt-text-muted">Redirecting\u2026</p>
      </DashboardPageShell>
    );
  }

  return (
    <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
      <DashboardPageShell>
        <ContentCard>
          {canSeeTeamTab ? (
            <PageTabs
              embedded
              aria-label="Time Log tabs"
              value={subTab}
              onValueChange={(value) => {
                if (value === "team") router.push("/dashboard/timelog/team");
                else if (value === "projects") router.push("/dashboard/timelog/projects");
                else router.push("/dashboard/timelog");
              }}
              items={timelogTabItems}
            />
          ) : null}

          <div className={canSeeTeamTab ? PAGE_TAB_BODY_CLASS : "space-y-6 p-4 sm:p-6"}>
          {hasAmRole ? <HrReviewNoticeBanner /> : null}

          {!isTeamView && !isProjectView ? (
            <MyWeeklyTimesheet />
          ) : null}

          {isProjectView ? (
            <ProjectTimelogPanel enabled />
          ) : null}

          {isHrTeamView ? (
            <div className={INNER_PANEL_CLASS}>
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
            </div>
          ) : null}

          {isTeamView && !isHrTeamView ? (
            <div className={INNER_PANEL_CLASS}>
                <PageSectionHeader
                  title="Team Time Logs"
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      <WeekPickerField weekStart={weekStart} onWeekStartChange={setWeekStart} disabled={entriesLoading} />
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        disabled={entriesLoading}
                        onClick={() => void loadEmployeeEntries()}
                      >
                        {entriesLoading ? <WtLoader size="sm" /> : "Refresh"}
                      </Button>
                    </div>
                  }
                />

                {canManagerApprove ? (
                  <p className="text-xs text-wt-text-muted">
                    Review individual entries below. Approve or reject each entry; rejected entries return to the employee
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
                    setEmployeeEntries([]);
                    void loadEmployeeEntries(v);
                  }}
                  placeholder="Select employee"
                  options={employeeOptions}
                />

                {entriesLoading ? (
                  <WtLoaderCentered label="" />
                ) : !teamEmployeeEmail.trim() ? (
                  <EmptyState
                    title="Select an Employee"
                    description="Choose a team member to review their time log entries for the selected week."
                    className="py-10"
                  />
                ) : !employeeEntries.length ? (
                  <EmptyState
                    title="No Time Log Entries"
                    description="There are no entries for this employee during the selected week."
                    className="py-10"
                  />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-wt-border">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-wt-surface-2 text-wt-text-muted">
                        <tr>
                          <th className="text-left px-2 py-2 font-medium whitespace-nowrap">Date</th>
                          <th className="text-left px-2 py-2 font-medium">Project</th>
                          <th className="text-left px-2 py-2 font-medium">Task Category</th>
                          <th className="text-left px-2 py-2 font-medium">Sub Category</th>
                          <th className="text-left px-2 py-2 font-medium">Description</th>
                          <th className="text-center px-2 py-2 font-medium">Hours</th>
                          <th className="text-center px-2 py-2 font-medium">Status</th>
                          {canManagerApprove ? (
                            <th className="text-center px-2 py-2 font-medium">Approve / Reject</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {employeeEntries.map((entry) => {
                          const taskLabel = TASK_CATEGORY_LABELS[entry.task_category] ?? entry.task_category;
                          const isActionable = entry.status === "SUBMITTED" || entry.status === "REJECTED";
                          return (
                            <tr key={entry.id} className="border-t border-wt-border hover:bg-wt-surface-2/50">
                              <td className="px-2 py-2 whitespace-nowrap tabular-nums">{entry.log_date}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{entry.project_code}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{taskLabel}</td>
                              <td className="px-2 py-2 whitespace-nowrap">{entry.sub_category || "—"}</td>
                              <td className="px-2 py-2 max-w-[200px] truncate">{entry.description || "—"}</td>
                              <td className="px-2 py-2 text-center tabular-nums">{entry.hours}h</td>
                              <td className="px-2 py-2 text-center">
                                <span className={entryStatusClass(entry.status)}>{entry.status}</span>
                                {entry.manager_comment ? (
                                  <div className="text-[10px] text-wt-text-muted mt-0.5 max-w-[120px] truncate" title={entry.manager_comment}>
                                    Remark: {entry.manager_comment}
                                  </div>
                                ) : null}
                              </td>
                              {canManagerApprove ? (
                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                  {isActionable ? (
                                    <div className="flex gap-1 justify-center">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="xs"
                                        className="border-emerald-300 px-1.5 py-0.5 text-[10px] text-emerald-700 hover:bg-emerald-50"
                                        onClick={() => setRemarkAction({ entryId: entry.id, action: "APPROVED" })}
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="xs"
                                        className="px-1.5 py-0.5 text-[10px]"
                                        onClick={() => setRemarkAction({ entryId: entry.id, action: "REJECTED" })}
                                      >
                                        Reject
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-wt-text-muted">—</span>
                                  )}
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          ) : null}
          </div>
        </ContentCard>
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
        <ApprovalRemarkModal
          open={remarkAction !== null}
          title={
            remarkAction?.action === "APPROVED" ? "Approve Time Log entry" : "Reject Time Log entry"
          }
          actionLabel={
            remarkAction?.action === "APPROVED" ? "Approve" : "Reject"
          }
          actionVariant={remarkAction?.action === "REJECTED" ? "destructive" : "brand"}
          onConfirm={handleEntryRemarkConfirm}
          onCancel={() => setRemarkAction(null)}
        />
      </DashboardPageShell>
    </OnboardingGate>
  );
}
