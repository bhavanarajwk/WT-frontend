"use client";

import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { InputField } from "@/components/dashboard/ui/forms";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { hrmsService, type AnnualCalendarItem } from "@/services/hrms.service";

function parseAnnualCalendarRows(res: unknown): AnnualCalendarItem[] {
  const envelope = res as { data?: unknown };
  const data = (envelope?.data ?? res) as Record<string, unknown> | undefined;
  const items = Array.isArray(data?.items) ? (data?.items as AnnualCalendarItem[]) : [];
  return items;
}

function isGoogleDocLink(url: string): boolean {
  const value = url.trim().toLowerCase();
  if (!value) return false;
  return (
    value.startsWith("https://docs.google.com/document/") ||
    value.startsWith("https://docs.google.com/spreadsheets/")
  );
}

function resolveAnnualCalendarUrl(rawValue: unknown): string | null {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return null;
}

export function AnnualCalendarPageClient() {
  const { hasHrAccess } = useDashboardAccess();
  const { toast, actionLoading, runAction } = useDashboardAction();
  const [rows, setRows] = useState<AnnualCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [title, setTitle] = useState("");
  const [documentLink, setDocumentLink] = useState("");

  const loadCalendars = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await hrmsService.getAnnualCalendars();
      const items = parseAnnualCalendarRows(res);
      items.sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0));
      setRows(items);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0));
  }, [rows]);

  async function submitUpload() {
    const yearNum = Number(year.trim());
    const titleTrimmed = title.trim();
    const link = documentLink.trim();

    if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 9999) {
      throw new Error("Enter a valid year.");
    }
    if (!link) {
      throw new Error("Document link is required.");
    }
    if (!isGoogleDocLink(link)) {
      throw new Error("External link must be a Google Docs/Drive URL.");
    }

    await hrmsService.uploadAnnualCalendar({
      year: yearNum,
      title: titleTrimmed || null,
      document_link: link,
    });

    setTitle("");
    setDocumentLink("");
    await loadCalendars();
  }

  return (
    <>
      <DashboardPageShell>
        <div className="space-y-5">
          {hasHrAccess ? (
            <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
              <h4 className="font-semibold">Upload / Replace Calendar</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <InputField
                  label="Year"
                  required
                  type="number"
                  value={year}
                  onChange={setYear}
                />
                <InputField
                  label="Title"
                  required
                  value={title}
                  onChange={setTitle}
                />
                <label className="flex flex-col gap-1 text-xs text-wt-text-muted sm:col-span-2">
                  Document link (Google Docs / Sheets)
                  <input
                    className="input-field px-3 py-2 text-sm"
                    value={documentLink}
                    onChange={(e) => setDocumentLink(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                </label>
              </div>
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm"
                disabled={actionLoading}
                onClick={() =>
                  runAction("Upload annual calendar", async () => {
                    await submitUpload();
                  })
                }
              >
                Upload calendar
              </button>
            </section>
          ) : null}

          <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="font-semibold">Available Calendars</h4>
              <button
                type="button"
                className="btn-ghost px-3 py-2 text-sm"
                onClick={() =>
                  runAction("Refresh annual calendar list", async () => {
                    await loadCalendars();
                  })
                }
              >
                Refresh
              </button>
            </div>
            {isLoading ? (
              <SectionLoading label="Loading calendars…" />
            ) : sortedRows.length === 0 ? (
              <p className="text-sm text-wt-text-muted">No annual calendars uploaded yet.</p>
            ) : (
              <div className="wt-scroll-both max-h-[min(70vh,520px)] overflow-auto rounded-xl border border-wt-border">
                <table className="wt-scrollable-table text-sm">
                  <thead className="wt-table-sticky-head text-wt-text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Year</th>
                      <th className="px-3 py-2 text-left font-medium">Title</th>
                      <th className="px-3 py-2 text-left font-medium">Created by</th>
                      <th className="px-3 py-2 text-left font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => {
                      const resolvedUrl = resolveAnnualCalendarUrl(row.document_link);
                      return (
                        <tr key={String(row.id)} className="border-t border-wt-border">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {resolvedUrl ? (
                              <a
                                href={resolvedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline font-medium"
                              >
                                {String(row.year ?? "—")}
                              </a>
                            ) : (
                              String(row.year ?? "—")
                            )}
                          </td>
                          <td className="px-3 py-2">{String(row.title ?? "—")}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {String(row.created_by_name ?? "—")}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {String(row.updated_at ?? row.created_at ?? "—")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </DashboardPageShell>
      <DashboardToast toast={toast} />
    </>
  );
}

