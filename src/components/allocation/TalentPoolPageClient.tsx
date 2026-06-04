"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { useTalentPoolTables } from "@/hooks/allocation/useTalentPool";
import {
  buildAllocateHref,
  formatTalentPoolDate,
  formatTalentPoolPreviousProject,
  formatProjectLabel,
  type AllocateTarget,
} from "@/utils/talentPool";

const NON_BILLABLE_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "NONBILLABLE", label: "NONBILLABLE" },
  { value: "NONDEPLOYABLE", label: "NONDEPLOYABLE" },
  { value: "TALENT_POOL", label: "TALENT_POOL (billing)" },
];

export function TalentPoolPageClient() {
  const { user, status: authStatus } = useAuth();
  const roles = user?.roles ?? [];
  const canView = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");
  const queriesEnabled = authStatus === "authenticated" && canView;

  const [searchInput, setSearchInput] = useState("");
  const [typeInput, setTypeInput] = useState("");

  const {
    data,
    pages,
    loading,
    error,
    loadDashboard,
    loadTablePage,
    applyFilters,
  } = useTalentPoolTables(queriesEnabled);

  useEffect(() => {
    if (!queriesEnabled) return;
    void loadDashboard();
  }, [queriesEnabled, loadDashboard]);

  if (authStatus === "loading") {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted">
          Loading…
        </div>
      </DashboardPageShell>
    );
  }

  if (!canView) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 shadow-sm">
          <h3 className="text-lg font-semibold">Access restricted</h3>
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

  return (
    <DashboardPageShell>
      <div className="rounded-xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-wt-border px-5 py-5 md:px-7">
          <div>
            <h3 className="text-lg font-semibold">{data?.label ?? "Talent Pool"}</h3>
            <p className="mt-1 text-sm text-wt-text-muted">
              Active BENCH (talent pool), unallocated employees, and non-billable project
              allocations. Internal project code remains BENCH.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="block text-xs text-wt-text-muted mb-1">Search</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters(searchInput, typeInput);
                }}
                className="w-52 max-w-full rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Name, email, role"
                aria-label="Search talent pool"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-wt-text-muted mb-1">Non-billable type</span>
              <select
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
                className="rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                aria-label="Non-billable allocation type filter"
              >
                {NON_BILLABLE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm hover:bg-wt-surface-3"
              onClick={() => applyFilters(searchInput, typeInput)}
            >
              Apply
            </button>
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              disabled={loading}
              onClick={() => void loadDashboard()}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-8 p-5 md:p-7">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          {loading && !data ? (
            <p className="text-sm text-wt-text-muted">Loading talent pool…</p>
          ) : data ? (
            <>
              <TalentPoolSection
                title={data.on_bench.label}
                subtitle={`${data.on_bench.total_elements} on talent pool (active BENCH)`}
                loading={loading}
                page={pages.onBench}
                totalPages={data.on_bench.total_pages}
                onPageChange={(p) => void loadTablePage("onBench", p)}
              >
                {data.on_bench.items.length ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-wt-surface-2 text-wt-text-muted">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Talent pool start</th>
                        <th className="text-left px-3 py-2 font-medium">Previous project</th>
                        <th className="text-left px-3 py-2 font-medium">Days on pool</th>
                        <th className="text-right px-3 py-2 font-medium">Allocate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.on_bench.items.map((row) => (
                        <tr
                          key={`bench-${row.allocation_id ?? row.user_id}-${row.employee_email}`}
                          className="border-t border-wt-border"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <EmployeeCell name={row.employee_name} empId={row.emp_id} />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatTalentPoolDate(row.talent_pool_start_date)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatTalentPoolPreviousProject(
                              row.previous_project_code,
                              row.previous_project_name
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.days_on_talent_pool ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <AllocateButton item={row} displayName={row.employee_name} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyRow label="No employees on talent pool." />
                )}
              </TalentPoolSection>

              <TalentPoolSection
                title={data.unallocated.label}
                subtitle={`${data.unallocated.total_elements} not allocated to a project`}
                loading={loading}
                page={pages.unallocated}
                totalPages={data.unallocated.total_pages}
                onPageChange={(p) => void loadTablePage("unallocated", p)}
              >
                {data.unallocated.items.length ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-wt-surface-2 text-wt-text-muted">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Days without project</th>
                        <th className="text-left px-3 py-2 font-medium">Previous project</th>
                        <th className="text-left px-3 py-2 font-medium">Load today</th>
                        <th className="text-right px-3 py-2 font-medium">Allocate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.unallocated.items.map((row) => (
                        <tr
                          key={`unalloc-${row.user_id}-${row.employee_email}`}
                          className="border-t border-wt-border"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <EmployeeCell name={row.employee_name} empId={row.emp_id} />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.days_without_project_allocation ?? "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatTalentPoolPreviousProject(
                              row.previous_project_code,
                              row.previous_project_name
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.project_load_percent_today ?? 0}%
                            {row.has_any_allocation ? (
                              <span className="block text-xs text-wt-text-muted">
                                Has other allocation
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <AllocateButton item={row} displayName={row.employee_name} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyRow label="No unallocated employees." />
                )}
              </TalentPoolSection>

              <TalentPoolSection
                title={data.non_billable.label}
                subtitle={`${data.non_billable.total_elements} non-billable on project`}
                loading={loading}
                page={pages.nonBillable}
                totalPages={data.non_billable.total_pages}
                onPageChange={(p) => void loadTablePage("nonBillable", p)}
              >
                {data.non_billable.items.length ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-wt-surface-2 text-wt-text-muted">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Project</th>
                        <th className="text-left px-3 py-2 font-medium">Type / billing</th>
                        <th className="text-left px-3 py-2 font-medium">Days</th>
                        <th className="text-right px-3 py-2 font-medium">Allocate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.non_billable.items.map((row) => (
                        <tr
                          key={`nb-${row.allocation_id}-${row.employee_email}`}
                          className="border-t border-wt-border"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <EmployeeCell name={row.employee_name} empId={row.emp_id} />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatProjectLabel(row.project_code, row.project_name)}
                            {row.role ? (
                              <span className="block text-xs text-wt-text-muted">{row.role}</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.allocation_type ?? "—"}
                            {row.billing_status ? (
                              <span className="block text-xs text-wt-text-muted">
                                {row.billing_status}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.days_on_non_billable ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <AllocateButton item={row} displayName={row.employee_name} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyRow label="No non-billable project allocations." />
                )}
              </TalentPoolSection>
            </>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}

function TalentPoolSection({
  title,
  subtitle,
  loading,
  page,
  totalPages,
  onPageChange,
  children,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  children: ReactNode;
}) {
  const safeTotal = Math.max(1, totalPages);
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-wt-text-muted">{subtitle}</p>
        </div>
        <TablePager
          page={page}
          totalPages={safeTotal}
          loading={loading}
          onPageChange={onPageChange}
        />
      </div>
      <div className="wt-scroll-both max-h-[min(50vh,420px)] rounded-xl border border-wt-border">
        {children}
      </div>
    </section>
  );
}

function TablePager({
  page,
  totalPages,
  loading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-wt-text-muted">
      <span>
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page <= 0 || loading}
        onClick={() => onPageChange(page - 1)}
        className="rounded-lg border border-wt-border bg-wt-surface-2 px-2 py-1 disabled:opacity-50"
      >
        Prev
      </button>
      <button
        type="button"
        disabled={page + 1 >= totalPages || loading}
        onClick={() => onPageChange(page + 1)}
        className="rounded-lg border border-wt-border bg-wt-surface-2 px-2 py-1 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

function EmployeeCell({ name, empId }: { name: string; empId: string | null }) {
  return (
    <>
      <span className="font-medium">{name || "—"}</span>
      {empId ? <span className="block text-xs text-wt-text-muted">{empId}</span> : null}
    </>
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
    <Link
      href={buildAllocateHref(item)}
      className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-indigo-700 hover:bg-indigo-100"
      title={`Allocate ${label}`}
      aria-label={`Allocate ${label}`}
    >
      <AllocateIcon />
    </Link>
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
