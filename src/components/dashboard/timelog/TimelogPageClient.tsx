"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
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
    DRAFT: "text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-xs font-medium",
    SUBMITTED: "text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-xs font-medium",
    APPROVED: "text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-xs font-medium",
    REJECTED: "text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-xs font-medium",
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
    void runAction(action.action === "APPROVED" ? "Approve timelog" : "Reject timelog", async () => {
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

  if (isOffboarded) {
    return (
      <DashboardPageShell>
        <p className="text-sm text-wt-text-muted">Timelog access is not available for offboarded users.</p>
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
        <div className="space-y-6">
          {hasAmRole ? <HrReviewNoticeBanner /> : null}

          {canSeeTeamTab ? (
            <div className="border-b border-wt-border pb-4">
              <Tabs value={subTab} onValueChange={(value) => {
                if (value === "team") router.push("/dashboard/timelog/team");
                else if (value === "projects") router.push("/dashboard/timelog/projects");
                else router.push("/dashboard/timelog");
              }}>
                <TabsList aria-label="Timelog tabs" className="gap-3 bg-transparent p-0">
                  <TabsTrigger value="my">My timelogs</TabsTrigger>
                  {/* <TabsTrigger value="team">Team timelogs</TabsTrigger> */}
                  <TabsTrigger value="projects">Team timelogs</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          ) : null}

          {!isTeamView && !isProjectView ? (
            <MyWeeklyTimesheet />
          ) : null}

          {isProjectView ? (
            <ProjectTimelogPanel enabled />
          ) : null}

          {isHrTeamView ? (
            <Card>
              <CardContent className="p-5 space-y-4">
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
              </CardContent>
            </Card>
          ) : null}

          {isTeamView && !isHrTeamView ? (
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold">Team timelogs</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <WeekPickerField weekStart={weekStart} onWeekStartChange={setWeekStart} disabled={entriesLoading} />
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="px-3 py-2 text-sm border border-wt-border rounded-lg"
                      disabled={entriesLoading}
                      onClick={() => void loadEmployeeEntries()}
                    >
                      {entriesLoading ? <WtLoader size="sm" /> : "Refresh"}
                    </Button>
                  </div>
                </div>

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
                  <p className="text-sm text-wt-text-muted py-8 text-center">Select an employee to view their timelogs.</p>
                ) : !employeeEntries.length ? (
                  <p className="text-sm text-wt-text-muted py-8 text-center">No timelog entries for this week.</p>
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
              </CardContent>
            </Card>
          ) : null}
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
        <ApprovalRemarkModal
          open={remarkAction !== null}
          title={
            remarkAction?.action === "APPROVED" ? "Approve timelog entry" : "Reject timelog entry"
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
