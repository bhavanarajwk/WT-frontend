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
import Link from "next/link";
import { type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { useTalentPoolTables } from "@/hooks/allocation/useTalentPool";
import {
  buildAllocateHref,
  formatTalentPoolPreviousProject,
  type AllocateTarget,
} from "@/utils/talentPool";

export function TalentPoolPageClient() {
  const { user, status: authStatus } = useAuth();
  const roles = user?.roles ?? [];
  const canView = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");
  const queriesEnabled = authStatus === "authenticated" && canView;

  const {
    data,
    pages,
    search,
    setSearch,
    loading,
    error,
    loadDashboard,
    loadUnallocatedPage,
  } = useTalentPoolTables(queriesEnabled);

  if (authStatus !== "loading" && !canView) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 shadow-sm">
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="mt-2 text-sm text-wt-text-muted">
            Talent pool is available to HR and admin only.
          </p>
          <Link
            href={DASHBOARD_ROUTES.overview}
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            Back to overview
          </Link>
        </div>
      </DashboardPageShell>
    );
  }

  const unallocated = data?.unallocated;

  return (
    <DashboardPageShell>
      <div className="rounded-xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-wt-border px-5 py-5 md:px-7">
          <h3 className="text-lg font-semibold">{data?.label ?? "Talent Pool"}</h3>
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 max-w-full rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Search"
              aria-label="Search"
            />
            <Button variant="brand" size="sm" type="button" className="px-4 py-2 text-sm" disabled={loading} onClick={() => void loadDashboard()}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-8 p-5 md:p-7">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          {loading && !data ? (
            <TableRowsSkeleton rows={6} columns={4} />
          ) : unallocated ? (
            <TalentPoolSection
              title={unallocated.label}
              loading={loading}
              page={pages.unallocated}
              totalPages={unallocated.total_pages}
              totalItems={unallocated.total_elements}
              pageSize={unallocated.page_size}
              onPageChange={(p) => void loadUnallocatedPage(p)}
            >
              {unallocated.items.length ? (
                <WtTable>
                  <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Days without project</TableHead>
                      <TableHead>Previous project</TableHead>
                      <TableHead className="text-right">Allocate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unallocated.items.map((row) => (
                      <TableRow
                        key={`unalloc-${row.user_id}-${row.employee_email}`}
                      >
                        <TableCell className="px-3 py-2 whitespace-nowrap">
                          {row.employee_name || "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 whitespace-nowrap">
                          {row.days_without_project_allocation ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 whitespace-nowrap">
                          {formatTalentPoolPreviousProject(
                            row.previous_project_code,
                            row.previous_project_name
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right">
                          <AllocateButton item={row} displayName={row.employee_name} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </WtTable>
              ) : (
                <EmptyRow label="No employees not allocated to a client project." />
              )}
            </TalentPoolSection>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}

function TalentPoolSection({
  title,
  loading,
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  children,
}: {
  title: string;
  loading: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  children: ReactNode;
}) {
  const safeTotal = Math.max(1, totalPages);
  const rangeStart = totalItems === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min(totalItems, (page + 1) * pageSize);

  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ScrollableTable maxHeightClass="max-h-[min(70vh,520px)]">
        {children}
      </ScrollableTable>
      <ListPagination
        page={page}
        totalPages={safeTotal}
        totalItems={totalItems}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        pageSize={pageSize}
        loading={loading}
        onPageChange={onPageChange}
      />
    </section>
  );
}

function AllocateButton({
  item,
  displayName,
}: {
  item: AllocateTarget;
  displayName?: string;
}) {
  const label = displayName || item.employee_email;
  return (
    <Button
      variant="brand"
      size="icon-sm"
      className="inline-flex items-center justify-center p-2"
      render={<Link href={buildAllocateHref(item)} />}
      title={`Allocate ${label}`}
      aria-label={`Allocate ${label}`}
    >
      <AllocateIcon />
    </Button>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="px-4 py-6 text-sm text-wt-text-muted">{label}</p>;
}

function AllocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
