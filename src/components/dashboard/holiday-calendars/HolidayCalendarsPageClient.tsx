"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { CARD_STACK_CLASS } from "@/components/dashboard/ui/uiLayout";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import {
  ManagementListCard,
  ManagementListContent,
} from "@/components/dashboard/ui/ManagementListCard";
import { hrmsService, type HolidayCalendarDetail } from "@/services/hrms.service";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CalendarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M12 3v12M7 8l5-5 5 5M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M12 3v12M7 14l5 5 5-5M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

import { Badge } from "@/components/ui/badge";
import { filledBadgeClass } from "@/components/dashboard/ui/badgeTones";

function HolidayTypeBadge({ optional }: { optional: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={optional ? filledBadgeClass("warning") : filledBadgeClass("slate")}
    >
      {optional ? "Optional" : "Mandatory"}
    </Badge>
  );
}

export function HolidayCalendarsPageClient() {
  const { hasHrAccess } = useDashboardAccess();
  const { actionLoading, runAction } = useDashboardAction();
  const holidayFileRef = useRef<HTMLInputElement>(null);
  const assignmentFileRef = useRef<HTMLInputElement>(null);

  const calendarQ = useQuery({
    queryKey: ["holiday-calendar", "company"],
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await hrmsService.getCompanyHolidayCalendar();
      return (res as { data?: HolidayCalendarDetail }).data ?? null;
    },
  });

  const detail = calendarQ.data ?? null;
  const isLoading = calendarQ.isLoading;

  const loadCalendar = useCallback(async () => {
    await calendarQ.refetch();
  }, [calendarQ]);

  async function importHolidays(file: File) {
    const res = await hrmsService.importHolidayCalendarsCsv(file);
    const data = (res as { data?: { processed?: number; skipped?: number; errors?: string[] } }).data;
    if (data?.errors?.length) {
      throw new Error(
        `Imported ${data.processed ?? 0}, skipped ${data.skipped ?? 0}. ${data.errors[0]}`
      );
    }
    await loadCalendar();
  }

  const holidayCount = detail?.holidays?.length ?? detail?.holiday_count ?? 0;

  return (
    <DashboardPageShell>
      <div className={`mx-auto w-full min-w-0 max-w-4xl overflow-x-hidden ${CARD_STACK_CLASS}`}>
        <Card className="p-0">
          <CardHeader>
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <CalendarIcon />
              </span>
              <div className="min-w-0">
                <CardTitle>Holiday Calendar</CardTitle>
                <CardDescription>
                  Configure company holidays and associate calendars with employees during onboarding,
                  from the employee profile, or via CSV import.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="text-sm text-indigo-900">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
              <strong>Note:</strong> Import holiday dates for the company calendar below. Assign
              calendars to employees individually during onboarding, from the employee profile, or
              using the employee assignment CSV.
            </div>
          </CardContent>
        </Card>

        {hasHrAccess ? (
          <Card className="p-0">
            <CardHeader>
              <CardTitle>Holiday Import &amp; Export</CardTitle>
              <CardDescription>
                CSV columns: <code className="text-indigo-700">holiday_date</code>,{" "}
                <code className="text-indigo-700">name</code>, optional{" "}
                <code className="text-indigo-700">is_optional</code>.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent>
              <input
                ref={holidayFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  runAction("Import Holidays", () => importHolidays(file));
                }}
              />

              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  disabled={actionLoading}
                  onClick={() => holidayFileRef.current?.click()}
                >
                  <UploadIcon />
                  Import CSV
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  disabled={actionLoading}
                  onClick={() =>
                    runAction("Export Holidays", async () => {
                      const blob = await hrmsService.downloadHolidayCalendarsCsv();
                      downloadBlob(blob, "company-holidays.csv");
                    })
                  }
                >
                  <DownloadIcon />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {hasHrAccess ? (
          <Card className="p-0">
            <CardHeader>
              <CardTitle>Employee Calendar Assignments</CardTitle>
              <CardDescription>
                CSV columns: <code className="text-indigo-700">email</code>,{" "}
                <code className="text-indigo-700">calendar_code</code>.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent>
              <input
                ref={assignmentFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  runAction("Import Assignments", async () => {
                    const res = await hrmsService.importEmployeeHolidayAssignmentsCsv(file);
                    const data = (res as {
                      data?: { processed?: number; skipped?: number; errors?: string[] };
                    }).data;
                    if (data?.errors?.length) {
                      throw new Error(
                        `Imported ${data.processed ?? 0}, skipped ${data.skipped ?? 0}. ${data.errors[0]}`
                      );
                    }
                  });
                }}
              />

              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  disabled={actionLoading}
                  onClick={() => assignmentFileRef.current?.click()}
                >
                  <UploadIcon />
                  Import Assignments CSV
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  disabled={actionLoading}
                  onClick={() =>
                    runAction("Export Assignments", async () => {
                      const blob = await hrmsService.downloadEmployeeHolidayAssignmentsCsv();
                      downloadBlob(blob, "employee-holiday-assignments.csv");
                    })
                  }
                >
                  <DownloadIcon />
                  Export Assignments CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <ManagementListCard
          title={detail?.name ?? "Company Holiday Calendar"}
          description={
            detail?.description ??
            (isLoading ? "Loading holiday calendar…" : `${holidayCount} holidays`)
          }
          headerAction={
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="w-full shrink-0 px-3 py-2 text-sm sm:w-auto"
              disabled={actionLoading || isLoading}
              onClick={() => runAction("Refresh Calendar", loadCalendar)}
            >
              Refresh
            </Button>
          }
        >
          <ManagementListContent
            isLoading={isLoading}
            isEmpty={!isLoading && !detail?.holidays?.length}
            emptyTitle="No Holidays Configured Yet"
            emptyDescription={
              hasHrAccess
                ? "Import a CSV with holiday_date and name columns."
                : "HR has not added company holidays yet."
            }
            emptyIcon={<CalendarIcon className="h-8 w-8 opacity-40" />}
            skeletonRows={6}
            skeletonColumns={3}
          >
            <>
              <div className="space-y-2 md:hidden">
                {detail?.holidays?.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="rounded-lg border border-wt-border bg-wt-surface-2/30 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{holiday.name}</p>
                      <HolidayTypeBadge optional={holiday.is_optional} />
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-wt-text-muted">
                      {holiday.holiday_date}
                    </p>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-auto rounded-lg border border-wt-border md:block">
                <WtTable className="min-w-full">
                  <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Holiday</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail?.holidays?.map((holiday) => (
                      <TableRow key={holiday.id}>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {holiday.holiday_date}
                        </TableCell>
                        <TableCell className="px-3 py-2">{holiday.name}</TableCell>
                        <TableCell className="px-3 py-2">
                          <HolidayTypeBadge optional={holiday.is_optional} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </WtTable>
              </div>
            </>
          </ManagementListContent>
        </ManagementListCard>
      </div>
    </DashboardPageShell>
  );
}
