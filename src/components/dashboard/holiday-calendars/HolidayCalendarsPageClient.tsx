"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
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

function HolidayTypeBadge({ optional }: { optional: boolean }) {
  if (optional) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
        Optional
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      Mandatory
    </span>
  );
}

export function HolidayCalendarsPageClient() {
  const { hasHrAccess } = useDashboardAccess();
  const { toast, actionLoading, runAction } = useDashboardAction();
  const [detail, setDetail] = useState<HolidayCalendarDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const holidayFileRef = useRef<HTMLInputElement>(null);
  const assignmentFileRef = useRef<HTMLInputElement>(null);

  const loadCalendar = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await hrmsService.getCompanyHolidayCalendar();
      setDetail((res as { data?: HolidayCalendarDetail }).data ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

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
    <>
      <DashboardPageShell>
        <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5 overflow-x-hidden sm:space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <CalendarIcon />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl lg:text-2xl">
                  Holiday Calendar
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-wt-text-muted">
                  Configure company holidays and associate calendars with employees during onboarding,
                  from the employee profile, or via CSV import.
                </p>
              </div>
            </div>
          </header>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
            <strong>Note:</strong> Import holiday dates for the company calendar below. Assign calendars
            to employees individually during onboarding, from the employee profile, or using the
            employee assignment CSV.
          </div>

          {hasHrAccess ? (
            <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold sm:text-lg">Holiday Import &amp; Export</h2>
              <p className="mt-1 text-sm text-wt-text-muted">
                CSV columns: <code className="text-indigo-700">holiday_date</code>,{" "}
                <code className="text-indigo-700">name</code>, optional{" "}
                <code className="text-indigo-700">is_optional</code>.
              </p>

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

              <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <button
                  type="button"
                  className="btn-secondary w-full"
                  disabled={actionLoading}
                  onClick={() => holidayFileRef.current?.click()}
                >
                  <UploadIcon />
                  Import CSV
                </button>
                <button
                  type="button"
                  className="btn-secondary w-full"
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
                </button>
              </div>
            </section>
          ) : null}

          {hasHrAccess ? (
            <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold sm:text-lg">Employee Calendar Assignments</h2>
              <p className="mt-1 text-sm text-wt-text-muted">
                CSV columns: <code className="text-indigo-700">email</code>,{" "}
                <code className="text-indigo-700">calendar_code</code>.
              </p>

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
                    const data = (res as { data?: { processed?: number; skipped?: number; errors?: string[] } })
                      .data;
                    if (data?.errors?.length) {
                      throw new Error(
                        `Imported ${data.processed ?? 0}, skipped ${data.skipped ?? 0}. ${data.errors[0]}`
                      );
                    }
                  });
                }}
              />

              <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <button
                  type="button"
                  className="btn-secondary w-full"
                  disabled={actionLoading}
                  onClick={() => assignmentFileRef.current?.click()}
                >
                  <UploadIcon />
                  Import Assignments CSV
                </button>
                <button
                  type="button"
                  className="btn-secondary w-full"
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
                </button>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-semibold sm:text-lg">
                  {detail?.name ?? "Company Holiday Calendar"}
                </h2>
                {detail?.description ? (
                  <p className="mt-1 text-sm text-wt-text-muted">{detail.description}</p>
                ) : null}
                <p className="mt-2 text-sm tabular-nums text-wt-text-muted">
                  {isLoading ? "Loading…" : `${holidayCount} holidays`}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost w-full shrink-0 px-3 py-2 text-sm sm:w-auto"
                disabled={actionLoading || isLoading}
                onClick={() => runAction("Refresh Calendar", loadCalendar)}
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-wt-border bg-wt-surface-2/50 px-4 py-12 text-sm text-wt-text-muted">
                <span className="spinner" />
                Loading Holidays…
              </div>
            ) : detail?.holidays?.length ? (
              <>
                <div className="space-y-2 md:hidden">
                  {detail.holidays.map((holiday) => (
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
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-wt-surface-2 text-wt-text-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Holiday</th>
                        <th className="px-3 py-2 text-left font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.holidays.map((holiday) => (
                        <tr key={holiday.id} className="border-t border-wt-border">
                          <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">
                            {holiday.holiday_date}
                          </td>
                          <td className="px-3 py-2">{holiday.name}</td>
                          <td className="px-3 py-2">
                            <HolidayTypeBadge optional={holiday.is_optional} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-wt-border bg-wt-surface-2/40 px-4 py-12 text-center">
                <CalendarIcon className="mb-3 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium">No Holidays Configured Yet</p>
                {hasHrAccess ? (
                  <p className="mt-2 max-w-sm text-xs leading-relaxed text-wt-text-muted">
                    Import a CSV with <code className="text-indigo-700">holiday_date</code> and{" "}
                    <code className="text-indigo-700">name</code> columns.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-wt-text-muted">
                    HR has not added company holidays yet.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </DashboardPageShell>
      <DashboardToast toast={toast} />
    </>
  );
}
