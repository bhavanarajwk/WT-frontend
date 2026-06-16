"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/error";
import { hrmsService, type AllocationExtensionRequestRow, type AllocationExtensionRequestStatus } from "@/services/hrms.service";
import { useAuth } from "@/context/AuthContext";
import { ApiDateField, SelectField } from "@/components/dashboard/ui/forms";
import {
  HrLeaveStatusToggle,
  type HrToggleStatus,
} from "@/components/dashboard/leave/HrLeaveStatusToggle";
import { formatApiDateDisplay } from "@/utils/apiDate";
import {
  buildAllocationExtensionContextQuery,
  buildCreateAllocationExtensionBody,
  findActiveAllocationForExtension,
  findExtensionAllocationContext,
  mergeExtensionContextWithAllocationRow,
  mergeAllocationExtensionRowFromStatusResponse,
  normalizeAllocationExtensionContext,
  parseManagerProjectsForExtension,
  resolveExtensionProjectCodeForSubmit,
  type AllocationExtensionContext,
  type ManagerExtensionProject,
} from "@/utils/allocationExtension";
import { parseEmployeeAllocationsResponse } from "@/utils/allocationList";
import { createEmptyAllocationExtensionForm } from "@/utils/allocationFormState";

type Toast = { type: "success" | "error"; message: string } | null;

function normalizeHrStatusFilter(value: string): AllocationExtensionRequestStatus | "" {
  const v = value.trim().toUpperCase();
  if (v === "ALL" || v === "") return "";
  if (v === "PENDING" || v === "APPROVED" || v === "REJECTED") return v;
  return "";
}

function asDateDisplayValue(value: string) {
  return formatApiDateDisplay(String(value ?? ""));
}

function toHrToggleStatus(status: string): HrToggleStatus {
  const v = status.trim().toUpperCase();
  if (v === "APPROVED" || v === "REJECTED") return v;
  return "PENDING";
}

export function AllocationExtensionPanel() {
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerRole = userRoles.includes("ROLE_MANAGER");
  const canCreateRequest = hasManagerRole && !hasHrAccess;

  const [toast, setToast] = useState<Toast>(null);

  // Manager create form
  const [createForm, setCreateForm] = useState(createEmptyAllocationExtensionForm);
  const [creating, setCreating] = useState(false);
  const [managerProjectsData, setManagerProjectsData] = useState<ManagerExtensionProject[]>([]);
  const [loadingCreateOptions, setLoadingCreateOptions] = useState(false);
  const [allocationContext, setAllocationContext] = useState<AllocationExtensionContext | null>(
    null
  );
  const [loadingContext, setLoadingContext] = useState(false);

  // Lists (HR list + Manager status)
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const size = 10;

  const [hrStatusFilter, setHrStatusFilter] = useState<AllocationExtensionRequestStatus | "">("");
  const [rows, setRows] = useState<AllocationExtensionRequestRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState<number | null>(null);

  const visibleMode = useMemo<"hr" | "manager">(() => {
    if (hasHrAccess) return "hr";
    return "manager";
  }, [hasHrAccess]);

  const managerProjects = useMemo(
    () =>
      managerProjectsData.map((p) => ({
        code: p.code,
        name: p.name,
      })),
    [managerProjectsData]
  );

  const selectedManagerProject = useMemo(() => {
    const value = createForm.projectCode.trim();
    if (!value) return undefined;
    if (/^\d+$/.test(value)) {
      const id = Number(value);
      return managerProjectsData.find((p) => p.id === id);
    }
    return managerProjectsData.find((p) => p.code.toLowerCase() === value.toLowerCase());
  }, [managerProjectsData, createForm.projectCode]);

  const managerEmployeesForProject = useMemo(() => {
    if (!createForm.projectCode.trim()) {
      const all = new Map<string, { email: string; name: string }>();
      for (const project of managerProjectsData) {
        for (const emp of project.employees) {
          all.set(emp.email, { email: emp.email, name: emp.name });
        }
      }
      return Array.from(all.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    return (selectedManagerProject?.employees ?? []).map((e) => ({
      email: e.email,
      name: e.name,
    }));
  }, [managerProjectsData, createForm.projectCode, selectedManagerProject]);

  const loadCreateOptions = useCallback(async () => {
    if (!canCreateRequest) return;
    setLoadingCreateOptions(true);
    try {
      const res = await hrmsService.getManagerProjectsWithRoles();
      const payload = (res as { data?: unknown }).data ?? res;
      setManagerProjectsData(parseManagerProjectsForExtension(payload));
    } catch {
      setManagerProjectsData([]);
    } finally {
      setLoadingCreateOptions(false);
    }
  }, [canCreateRequest]);

  const resolveExtensionContext = useCallback(
    async (query: { userEmail: string; projectCode?: string; projectId?: number }) => {
      const projectValue = createForm.projectCode.trim();
      let context: AllocationExtensionContext | null = null;

      const loadContext = async (params: {
        userEmail: string;
        projectCode?: string;
        projectId?: number;
      }) => {
        const res = await hrmsService.getAllocationExtensionContext(params);
        const raw = (res as { data?: unknown }).data ?? res;
        if (raw && typeof raw === "object") {
          return normalizeAllocationExtensionContext(raw as Record<string, unknown>);
        }
        return null;
      };

      try {
        context = await loadContext(query);
      } catch {
        context = null;
      }

      const managerProject = managerProjectsData.find((project) => {
        if (/^\d+$/.test(projectValue)) return project.id === Number(projectValue);
        return project.code.toLowerCase() === projectValue.toLowerCase();
      });

      if (!context?.current_end_date && managerProject?.id && query.projectId == null) {
        try {
          const byProjectId = await loadContext({
            userEmail: query.userEmail,
            projectId: managerProject.id,
          });
          if (byProjectId) context = byProjectId;
        } catch {
          /* keep prior context */
        }
      }

      if (!context?.current_end_date) {
        context =
          findExtensionAllocationContext(managerProjectsData, query.userEmail, projectValue) ??
          context;
      }

      if (!context?.current_end_date) {
        try {
          const empRes = await hrmsService.getEmployeeAllocations({ userEmail: query.userEmail });
          const parsed = parseEmployeeAllocationsResponse(empRes);
          const allocationRow = findActiveAllocationForExtension(
            parsed?.allocations ?? [],
            projectValue
          );
          if (allocationRow) {
            context = mergeExtensionContextWithAllocationRow(
              context,
              allocationRow,
              { userEmail: query.userEmail, projectValue },
              managerProjectsData
            );
          }
        } catch {
          /* keep prior context */
        }
      }

      return context;
    },
    [createForm.projectCode, managerProjectsData]
  );

  const loadAllocationContext = useCallback(async () => {
    const query = buildAllocationExtensionContextQuery({
      userEmail: createForm.userEmail,
      projectValue: createForm.projectCode,
    });
    if (!query) {
      setAllocationContext(null);
      return;
    }

    setLoadingContext(true);
    try {
      setAllocationContext(await resolveExtensionContext(query));
    } finally {
      setLoadingContext(false);
    }
  }, [createForm.userEmail, createForm.projectCode, resolveExtensionContext]);

  const load = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      if (visibleMode === "hr") {
        const res = await hrmsService.listAllocationExtensionRequests({
          page,
          size,
          search: search.trim() || undefined,
          status: hrStatusFilter ? hrStatusFilter : undefined,
        });
        setRows(res.data.data ?? []);
        setTotalPages(res.data.total_pages ?? 1);
        setTotalElements(res.data.total_elements ?? 0);
        return;
      }

      const res = await hrmsService.listManagerAllocationExtensionStatus({
        page,
        size,
        search: search.trim() || undefined,
      });
      setRows(res.data.data ?? []);
      setTotalPages(res.data.total_pages ?? 1);
      setTotalElements(res.data.total_elements ?? 0);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load extension requests.";
      setToast({ type: "error", message: msg });
      setRows([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [visibleMode, page, size, search, hrStatusFilter]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadCreateOptions();
  }, [loadCreateOptions]);

  useEffect(() => {
    void loadAllocationContext();
  }, [loadAllocationContext]);

  async function submitCreate() {
    const userEmail = createForm.userEmail.trim();
    const projectCode = resolveExtensionProjectCodeForSubmit(
      createForm.projectCode,
      allocationContext
    );
    const requestedEndDate = createForm.requestedEndDate.trim();
    const reason = createForm.reason.trim();

    if (!userEmail || !projectCode || !requestedEndDate) {
      setToast({
        type: "error",
        message: "Employee, project, and requested end date are required.",
      });
      return;
    }

    if (allocationContext && !allocationContext.extension_allowed) {
      setToast({
        type: "error",
        message: "Extension is not allowed for this allocation (no current end date).",
      });
      return;
    }

    setCreating(true);
    setToast(null);
    try {
      const body = buildCreateAllocationExtensionBody({
        userEmail,
        projectCode,
        requestedEndDate,
        reason: reason || undefined,
      });
      if (!body.requestedEndDate) {
        setToast({ type: "error", message: "Enter a valid requested end date (dd/mm/yyyy)." });
        setCreating(false);
        return;
      }
      const res = await hrmsService.createAllocationExtensionRequest(body);
      setToast({ type: "success", message: `Extension request created (ID: ${res.data}).` });
      setCreateForm(createEmptyAllocationExtensionForm());
      setAllocationContext(null);
      setPage(0);
      void load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to create extension request.";
      setToast({ type: "error", message: msg });
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(requestId: number, next: "APPROVED" | "REJECTED") {
    setToast(null);
    setUpdatingRequestId(requestId);
    try {
      const res = await hrmsService.updateAllocationExtensionRequestStatus({
        requestId,
        status: next,
      });
      setRows((prev) =>
        prev.map((row) =>
          row.id === requestId
            ? mergeAllocationExtensionRowFromStatusResponse(row, res.data, next)
            : row
        )
      );
      setToast({ type: "success", message: `Request ${next.toLowerCase()}.` });
      void load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to update status.";
      setToast({ type: "error", message: msg });
    } finally {
      setUpdatingRequestId(null);
    }
  }

  function handleHrDecisionChange(
    requestId: number,
    current: HrToggleStatus,
    next: HrToggleStatus
  ) {
    if (next === current || next === "PENDING") return;
    void updateStatus(requestId, next);
  }

  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  if (!hasHrAccess && !hasManagerRole) {
    return (
      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <p className="text-sm text-wt-text-muted">You don’t have access to allocation extension requests.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {toast ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-rose-300 bg-rose-50 text-rose-900"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {canCreateRequest ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
          <h3 className="font-semibold">Request allocation end-date extension</h3>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SelectField
              label="Project name"
              required
              value={createForm.projectCode}
              onChange={(projectCode) => {
                const value = projectCode.trim();
                const project = /^\d+$/.test(value)
                  ? managerProjectsData.find((proj) => proj.id === Number(value))
                  : managerProjectsData.find(
                      (proj) => proj.code.toLowerCase() === value.toLowerCase()
                    );
                setCreateForm((prev) => {
                  const keepEmployee =
                    Boolean(prev.userEmail) &&
                    project?.employees.some((e) => e.email === prev.userEmail);
                  return {
                    ...prev,
                    projectCode,
                    userEmail: keepEmployee ? prev.userEmail : "",
                  };
                });
              }}
              disabled={loadingCreateOptions || !managerProjects.length}
              placeholder={
                loadingCreateOptions
                  ? "Loading projects..."
                  : managerProjects.length
                    ? "Select project"
                    : "No projects found"
              }
              options={managerProjects.map((opt) => ({
                value: opt.code,
                label: opt.name,
              }))}
            />

            <SelectField
              label="Employee name"
              required
              value={createForm.userEmail}
              onChange={(userEmail) => setCreateForm((p) => ({ ...p, userEmail }))}
              disabled={
                loadingCreateOptions ||
                !createForm.projectCode.trim() ||
                !managerEmployeesForProject.length
              }
              placeholder={
                !createForm.projectCode.trim()
                  ? "Select project first"
                  : loadingCreateOptions
                    ? "Loading employees..."
                    : managerEmployeesForProject.length
                      ? "Select employee"
                      : "No employees on this project"
              }
              options={managerEmployeesForProject.map((opt) => ({
                value: opt.email,
                label: opt.name,
              }))}
            />

            <label className="text-sm">
              <span className="block text-xs text-wt-text-muted mb-1">
                Current allocation end date
              </span>
              <div
                className="w-full rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm text-wt-text"
                aria-live="polite"
              >
                {loadingContext && createForm.userEmail && createForm.projectCode
                  ? "Loading…"
                  : allocationContext?.current_end_date
                    ? asDateDisplayValue(allocationContext.current_end_date)
                    : createForm.userEmail && createForm.projectCode
                      ? "—"
                      : "Select employee and project"}
              </div>
              {allocationContext && !allocationContext.extension_allowed ? (
                <p className="mt-1 text-xs text-amber-700">
                  This allocation has no end date. Extensions require a current end date.
                </p>
              ) : null}
            </label>

            <ApiDateField
              label="Requested end date"
              required
              min={allocationContext?.minimum_requested_end_date ?? undefined}
              disabled={
                !createForm.userEmail.trim() ||
                !createForm.projectCode.trim() ||
                (allocationContext != null && !allocationContext.extension_allowed)
              }
              value={createForm.requestedEndDate}
              onChange={(requestedEndDate) =>
                setCreateForm((p) => ({
                  ...p,
                  requestedEndDate,
                }))
              }
            />

            <label className="text-sm md:col-span-2">
              <span className="block text-xs text-wt-text-muted mb-1">Reason (optional)</span>
              <input
                value={createForm.reason}
                onChange={(e) => setCreateForm((p) => ({ ...p, reason: e.target.value }))}
                className="w-full rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Needed for release closure"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={
                creating ||
                loadingContext ||
                (allocationContext != null && !allocationContext.extension_allowed)
              }
              onClick={() => void submitCreate()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? "Submitting…" : "Submit request"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateForm(createEmptyAllocationExtensionForm());
                setAllocationContext(null);
              }}
              className="rounded-xl border border-wt-border bg-wt-surface-2 px-4 py-2 text-sm text-wt-text hover:bg-wt-surface-3"
            >
              Clear
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <h3 className="font-semibold">
              {visibleMode === "hr" ? "Allocation extension requests" : "My allocation extension requests"}
            </h3>
            <p className="text-xs text-wt-text-muted">
              {loading ? "Loading…" : `${totalElements} total`}
            </p>
          </div>

          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-64 max-w-full rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Search"
            aria-label="Search"
          />

          {visibleMode === "hr" ? (
            <SelectField
              label="Status"
              value={hrStatusFilter}
              onChange={(v) => {
                setHrStatusFilter(normalizeHrStatusFilter(v));
                setPage(0);
              }}
              placeholder="All"
              options={[
                { value: "", label: "All" },
                { value: "PENDING", label: "PENDING" },
                { value: "APPROVED", label: "APPROVED" },
                { value: "REJECTED", label: "REJECTED" },
              ]}
            />
          ) : null}

          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-wt-border bg-wt-surface-2 px-4 py-2 text-sm text-wt-text hover:bg-wt-surface-3"
          >
            Refresh
          </button>
        </div>

        {rows.length ? (
          <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
            <table className="wt-scrollable-table text-sm">
              <thead className="wt-table-sticky-head text-wt-text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Employee</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Project</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Current end</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Requested end</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Status</th>
                  {visibleMode === "hr" ? (
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Requested by</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const status = String(r.status ?? "PENDING").toUpperCase();
                  const hrStatus = toHrToggleStatus(status);
                  return (
                    <tr key={String(r.id)} className="border-t border-wt-border">
                      <td className="px-3 py-2 whitespace-nowrap">{r.employee_name || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.project_name || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.current_end_date ? asDateDisplayValue(r.current_end_date) : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {asDateDisplayValue(r.requested_end_date)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {visibleMode === "hr" ? (
                          <HrLeaveStatusToggle
                            value={hrStatus}
                            onChange={(next) =>
                              handleHrDecisionChange(r.id, hrStatus, next)
                            }
                            loading={updatingRequestId === r.id}
                            threeWay
                          />
                        ) : (
                          <span
                            className={
                              status === "APPROVED"
                                ? "text-emerald-700"
                                : status === "REJECTED"
                                  ? "text-rose-700"
                                  : "text-amber-700"
                            }
                          >
                            {status}
                          </span>
                        )}
                      </td>
                      {visibleMode === "hr" ? (
                        <td className="px-3 py-2 whitespace-nowrap">{r.requested_by_name || "—"}</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-wt-text-muted">{loading ? "Loading…" : "No extension requests found."}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-wt-text-muted">
            Page {page + 1} of {Math.max(1, totalPages)}
          </p>
          <div className="inline-flex gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-1.5 text-sm text-wt-text hover:bg-wt-surface-3 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-1.5 text-sm text-wt-text hover:bg-wt-surface-3 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

