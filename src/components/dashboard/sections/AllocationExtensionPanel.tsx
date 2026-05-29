"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/error";
import { hrmsService, type AllocationExtensionRequestRow, type AllocationExtensionRequestStatus } from "@/services/hrms.service";
import { useAuth } from "@/context/AuthContext";

type Toast = { type: "success" | "error"; message: string } | null;
type ManagerEmployeeOption = { email: string; name: string };
type ManagerProjectOption = { code: string; name: string };

function normalizeStatus(value: string): AllocationExtensionRequestStatus | "" {
  const v = value.trim().toUpperCase();
  if (v === "PENDING" || v === "APPROVED" || v === "REJECTED") return v;
  return "";
}

function asDateInputValue(value: string) {
  // Accepts ISO strings; keeps YYYY-MM-DD for <input type="date">
  return String(value ?? "").slice(0, 10);
}

export function AllocationExtensionPanel() {
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerRole = userRoles.includes("ROLE_MANAGER");
  const canCreateRequest = hasManagerRole && !hasHrAccess;
  const canViewManagerStatus = hasManagerRole && !hasHrAccess;

  const [toast, setToast] = useState<Toast>(null);

  // Manager create form
  const [createForm, setCreateForm] = useState({
    userEmail: "",
    projectCode: "",
    requestedEndDate: "",
    reason: "",
  });
  const [creating, setCreating] = useState(false);
  const [managerEmployees, setManagerEmployees] = useState<ManagerEmployeeOption[]>([]);
  const [managerProjects, setManagerProjects] = useState<ManagerProjectOption[]>([]);
  const [loadingCreateOptions, setLoadingCreateOptions] = useState(false);

  // Lists (HR list + Manager status)
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const size = 10;

  const [hrStatusFilter, setHrStatusFilter] = useState<AllocationExtensionRequestStatus | "">("PENDING");
  const [mgrProjectCode, setMgrProjectCode] = useState("");

  const [rows, setRows] = useState<AllocationExtensionRequestRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);

  const visibleMode = useMemo<"hr" | "manager">(() => {
    if (hasHrAccess) return "hr";
    return "manager";
  }, [hasHrAccess]);

  const loadCreateOptions = useCallback(async () => {
    if (!canCreateRequest) return;
    setLoadingCreateOptions(true);
    try {
      const res = await hrmsService.getManagerProjectsWithRoles();
      const payload = (res as { data?: unknown }).data ?? res;
      const root = payload as
        | {
            projects?: Array<Record<string, unknown>>;
            data?: { projects?: Array<Record<string, unknown>> };
          }
        | undefined;
      const projectsRaw =
        (Array.isArray(root?.projects) ? root?.projects : undefined) ??
        (Array.isArray(root?.data?.projects) ? root?.data?.projects : undefined) ??
        [];

      const projectMap = new Map<string, ManagerProjectOption>();
      const employeeMap = new Map<string, ManagerEmployeeOption>();

      for (const project of projectsRaw) {
        const code = String(project.project_code ?? project.projectCode ?? "").trim();
        const name = String(project.project_name ?? project.projectName ?? code).trim();
        if (code) projectMap.set(code.toLowerCase(), { code, name: name || code });

        const employees = Array.isArray(project.employees)
          ? (project.employees as Array<Record<string, unknown>>)
          : [];
        for (const emp of employees) {
          const email = String(emp.email ?? emp.user_email ?? emp.userEmail ?? "").trim().toLowerCase();
          const empName = String(emp.name ?? emp.employee_name ?? emp.employeeName ?? email).trim();
          if (email) {
            employeeMap.set(email, { email, name: empName || email });
          }
        }
      }

      const nextProjects = Array.from(projectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      const nextEmployees = Array.from(employeeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setManagerProjects(nextProjects);
      setManagerEmployees(nextEmployees);
      setCreateForm((prev) => ({
        ...prev,
        userEmail: prev.userEmail || nextEmployees[0]?.email || "",
        projectCode: prev.projectCode || nextProjects[0]?.code || "",
      }));
    } catch {
      setManagerProjects([]);
      setManagerEmployees([]);
    } finally {
      setLoadingCreateOptions(false);
    }
  }, [canCreateRequest]);

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
        projectCode: mgrProjectCode.trim() || undefined,
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
  }, [visibleMode, page, size, search, hrStatusFilter, mgrProjectCode]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadCreateOptions();
  }, [loadCreateOptions]);

  async function submitCreate() {
    const userEmail = createForm.userEmail.trim();
    const projectCode = createForm.projectCode.trim();
    const requestedEndDate = createForm.requestedEndDate.trim();
    const reason = createForm.reason.trim();

    if (!userEmail || !projectCode || !requestedEndDate) {
      setToast({ type: "error", message: "User email, project code, and requested end date are required." });
      return;
    }

    setCreating(true);
    setToast(null);
    try {
      const res = await hrmsService.createAllocationExtensionRequest({
        userEmail,
        projectCode,
        requestedEndDate,
        reason: reason || undefined,
        user_email: userEmail,
        project_code: projectCode,
        requested_end_date: requestedEndDate,
      });
      setToast({ type: "success", message: `Extension request created (ID: ${res.data}).` });
      setCreateForm((p) => ({ ...p, requestedEndDate: "", reason: "" }));
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
    try {
      await hrmsService.updateAllocationExtensionRequestStatus({ requestId, status: next });
      setToast({ type: "success", message: `Request ${next.toLowerCase()}.` });
      void load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to update status.";
      setToast({ type: "error", message: msg });
    }
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">Request allocation end-date extension</h3>
            <p className="text-xs text-wt-text-muted">Manager initiated; HR approves/rejects.</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="block text-xs text-wt-text-muted mb-1">Employee name</span>
              <select
                value={createForm.userEmail}
                onChange={(e) => setCreateForm((p) => ({ ...p, userEmail: e.target.value }))}
                className="w-full rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                disabled={loadingCreateOptions || !managerEmployees.length}
              >
                {!managerEmployees.length ? (
                  <option value="">
                    {loadingCreateOptions ? "Loading employees..." : "No employees found"}
                  </option>
                ) : null}
                {managerEmployees.map((opt) => (
                  <option key={opt.email} value={opt.email}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="block text-xs text-wt-text-muted mb-1">Project name</span>
              <select
                value={createForm.projectCode}
                onChange={(e) => setCreateForm((p) => ({ ...p, projectCode: e.target.value }))}
                className="w-full rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                disabled={loadingCreateOptions || !managerProjects.length}
              >
                {!managerProjects.length ? (
                  <option value="">
                    {loadingCreateOptions ? "Loading projects..." : "No projects found"}
                  </option>
                ) : null}
                {managerProjects.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="block text-xs text-wt-text-muted mb-1">Requested end date</span>
              <input
                type="date"
                value={createForm.requestedEndDate}
                onChange={(e) => setCreateForm((p) => ({ ...p, requestedEndDate: e.target.value }))}
                className="w-full rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </label>

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
              disabled={creating}
              onClick={() => void submitCreate()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? "Submitting…" : "Submit request"}
            </button>
            <button
              type="button"
              onClick={() =>
                setCreateForm({
                  userEmail: "",
                  projectCode: "",
                  requestedEndDate: "",
                  reason: "",
                })
              }
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
              {visibleMode === "hr" ? "Allocation extension requests (HR)" : "My allocation extension requests"}
            </h3>
            <p className="text-xs text-wt-text-muted">
              {loading ? "Loading…" : `${totalElements} total`}
            </p>
          </div>

          <label className="text-sm">
            <span className="block text-xs text-wt-text-muted mb-1">Search</span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-64 max-w-full rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Search name"
              aria-label="Search name"
            />
          </label>

          {visibleMode === "hr" ? (
            <label className="text-sm">
              <span className="block text-xs text-wt-text-muted mb-1">Status</span>
              <select
                value={hrStatusFilter}
                onChange={(e) => {
                  setHrStatusFilter(normalizeStatus(e.target.value));
                  setPage(0);
                }}
                className="rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">All</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </label>
          ) : canViewManagerStatus ? (
            <label className="text-sm">
              <span className="block text-xs text-wt-text-muted mb-1">Project code</span>
              <input
                value={mgrProjectCode}
                onChange={(e) => {
                  setMgrProjectCode(e.target.value);
                  setPage(0);
                }}
                className="w-44 max-w-full rounded-xl border border-wt-border bg-wt-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="(optional)"
              />
            </label>
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
            <table className="min-w-full text-sm">
              <thead className="bg-wt-surface-2 text-wt-text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Employee</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Email</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Project</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Current end</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Requested end</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Status</th>
                  {visibleMode === "hr" ? (
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Requested by</th>
                  ) : null}
                  {visibleMode === "hr" ? (
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const status = String(r.status ?? "PENDING").toUpperCase();
                  const isPending = status === "PENDING";
                  return (
                    <tr key={String(r.id)} className="border-t border-wt-border">
                      <td className="px-3 py-2 whitespace-nowrap">{r.employee_name || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.employee_email || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-medium">{r.project_code || "—"}</span>
                        <span className="text-wt-text-muted">{" · "}{r.project_name || "—"}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.current_end_date ? asDateInputValue(r.current_end_date) : "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{asDateInputValue(r.requested_end_date)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{status}</td>
                      {visibleMode === "hr" ? (
                        <td className="px-3 py-2 whitespace-nowrap">{r.requested_by_name || "—"}</td>
                      ) : null}
                      {visibleMode === "hr" ? (
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={!isPending}
                              onClick={() => void updateStatus(r.id, "APPROVED")}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={!isPending}
                              onClick={() => void updateStatus(r.id, "REJECTED")}
                              className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
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

