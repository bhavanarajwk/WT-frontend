"use client";

import { Button } from "@/components/ui/button";
import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { TableRowsSkeleton } from "@/components/dashboard/ui/SectionSkeleton";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { ContentCard } from "@/components/dashboard/ui/ContentCard";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { PageSectionHeader } from "@/components/dashboard/ui/PageSectionHeader";
import { CARD_CONTENT_CLASS } from "@/components/dashboard/ui/uiLayout";
import { UI_COPY } from "@/constants/uiCopy";
import { InputField } from "@/components/dashboard/ui/forms";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
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
  const { actionLoading, runAction } = useDashboardAction();
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
        {hasHrAccess ? (
          <ContentCard>
            <div className={CARD_CONTENT_CLASS}>
              <PageSectionHeader
                title="Upload / Replace Calendar"
                description="Add or update annual calendar documents for the organization."
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                <div className="sm:col-span-2">
                  <InputField
                    label="Document Link (Google Docs / Sheets)"
                    value={documentLink}
                    onChange={setDocumentLink}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                </div>
              </div>
              <Button variant="brand" size="sm" type="button" className="px-4 py-2 text-sm" disabled={actionLoading} onClick={() =>
                  runAction("Upload annual calendar", async () => {
                    await submitUpload();
                  })
                }
              >
                Upload Calendar
              </Button>
            </div>
          </ContentCard>
        ) : null}

        <ContentCard>
          <div className={CARD_CONTENT_CLASS}>
            <PageSectionHeader
              title="Available Calendars"
              action={
                <Button variant="ghost" size="sm" type="button" className="px-3 py-2 text-sm" onClick={() =>
                  runAction("Refresh annual calendar list", async () => {
                    await loadCalendars();
                  })
                }
              >
                Refresh
              </Button>
              }
            />
            <div className="mt-6">
            {isLoading ? (
              <TableRowsSkeleton rows={4} columns={4} />
            ) : sortedRows.length === 0 ? (
              <EmptyState title={UI_COPY.noRecordsFound} description="No annual calendars uploaded yet." />
            ) : (
              <ScrollableTable maxHeightClass="max-h-[min(70vh,520px)]">
                <WtTable>
                  <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Year</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Created by</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.map((row) => {
                      const resolvedUrl = resolveAnnualCalendarUrl(row.document_link);
                      return (
                        <TableRow key={String(row.id)}>
                          <TableCell className="px-3 py-2 whitespace-nowrap">
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
                          </TableCell>
                          <TableCell className="px-3 py-2">{String(row.title ?? "—")}</TableCell>
                          <TableCell className="px-3 py-2 whitespace-nowrap">
                            {String(row.created_by_name ?? "—")}
                          </TableCell>
                          <TableCell className="px-3 py-2 whitespace-nowrap">
                            {String(row.updated_at ?? row.created_at ?? "—")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </WtTable>
              </ScrollableTable>
            )}
            </div>
          </div>
        </ContentCard>
      </DashboardPageShell>
    </>
  );
}

