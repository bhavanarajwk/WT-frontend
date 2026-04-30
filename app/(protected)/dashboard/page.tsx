"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/src/api/httpClient";
import { endpoints } from "@/src/api/endpoints";
import { hrmsService } from "@/src/services/hrms.service";
import { useOverviewData } from "@/src/hooks/useOverviewData";
import { ApiError } from "@/src/api/error";

const DEFAULT_DEPARTMENT_OPTIONS = [
  "Developer",
  "Quality Assurance",
  "UI/UX",
  "Delivery Manager",
  "AI/ML",
  "Human Resources",
  "Finance",
  "QA",
  "Project Manager",
  "Business Analyst",
  "Account Manager",
];
const MAX_ONBOARD_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ONBOARD_TOTAL_BYTES = 6 * 1024 * 1024;

export default function DashboardPage() {
  const { user, signOut, refresh: refreshSession } = useAuth();
  const { metrics, loading, error, refresh } = useOverviewData();
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("wt-theme");
    if (stored === "dark" || stored === "light" || stored === "system") return stored;
    return "light";
  });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [empId, setEmpId] = useState("");
  const [employeeProfile, setEmployeeProfile] = useState<Record<string, unknown> | null>(null);
  const [onboardedUsers, setOnboardedUsers] = useState<Array<Record<string, unknown>>>([]);
  const [allocations, setAllocations] = useState<Array<Record<string, unknown>>>([]);
  const [allocationRoles, setAllocationRoles] = useState<string[]>([]);
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [assignedProjects, setAssignedProjects] = useState<Array<Record<string, unknown>>>([]);
  const [timelogs, setTimelogs] = useState<Array<Record<string, unknown>>>([]);
  const [leaveSummary, setLeaveSummary] = useState<Array<Record<string, unknown>>>([]);
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);
  const [bands, setBands] = useState<Array<Record<string, unknown>>>([]);
  const [kpis, setKpis] = useState<Array<Record<string, unknown>>>([]);

  const [timelogApproval, setTimelogApproval] = useState({
    timelog_id: "",
    status: "APPROVED",
    manager_comment: "",
  });

  const [leaveRequestForm, setLeaveRequestForm] = useState({
    request_from_date: "",
    request_to_date: "",
    request_type: "LEAVE",
    comments: "",
    is_half_day: false,
  });

  const [onboardForm, setOnboardForm] = useState({
    emp_id: "",
    email: "",
    name: "",
    user_type: "FULLTIME",
    department: "",
    phone_number: "",
    work_mode: "WFO",
    work_location_type: "OFFSHORE",
    role: "",
    band_id: 1,
    delivery_status: "DELIVERABLE",
    doj: "",
    doi: "",
    internship_duration: "",
  });

  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({
    leave: null,
    allocation: null,
    userData: null,
    batch: null,
  });
  const [onboardBands, setOnboardBands] = useState<Array<Record<string, unknown>>>([]);
  const [onboardDepartments, setOnboardDepartments] = useState<string[]>([]);
  const [bandDeptRoleMap, setBandDeptRoleMap] = useState<Record<string, string[]>>({});
  const [selfOnboardForm, setSelfOnboardForm] = useState({
    yoe: "",
    experience: "",
    primary_skills: "",
    secondary_skill: "",
    secondary_rating: "3",
    work_location_type: "OFFSHORE",
  });
  const [selfOnboardFiles, setSelfOnboardFiles] = useState<Record<string, File | null>>({
    resume: null,
    profile_photo: null,
    aadhaar: null,
    pan_card: null,
  });
  const [selfProfileForm, setSelfProfileForm] = useState({
    phone_number: "",
    work_mode: "WFO",
    primary_skills: "",
    secondary_skill: "",
    secondary_rating: "3",
    experience: "",
    yoe: "",
    work_location_type: "OFFSHORE",
  });
  const [selfProfilePic, setSelfProfilePic] = useState<File | null>(null);
  const [isSelfOnboarded, setIsSelfOnboarded] = useState<boolean>(user?.status === "ACTIVE");
  const [projectForm, setProjectForm] = useState({
    project_code: "",
    project_name: "",
    project_type: "IN_HOUSE",
  });
  const [projectFilters, setProjectFilters] = useState({
    search: "",
    project_type: "ALL",
  });
  const [projectCodeToDelete, setProjectCodeToDelete] = useState("");
  const [allocationForm, setAllocationForm] = useState({
    allocation_id: "",
    employee_email: "",
    project_code: "",
    role: "",
    allocated_hours: "8",
    start_date: "",
    end_date: "",
    allocation_type: "DEPLOYABLE",
    is_manager: false,
  });
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = userRoles.includes("ROLE_MANAGER");
  const isEmployee = userRoles.includes("ROLE_EMPLOYEE");
  const restrictForPendingOnboarding =
    isEmployee && !hasHrAccess && !hasManagerAccess;
  const requiresSelfOnboarding = restrictForPendingOnboarding && !isSelfOnboarded;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const loadMyProfile = useCallback(async () => {
    const res = await hrmsService.getMyProfile();
    const profile = (res.data ?? null) as Record<string, unknown> | null;
    setEmployeeProfile(profile);
    if (!profile) return;

    const status = String(profile.status ?? user?.status ?? "").toUpperCase();
    setIsSelfOnboarded(status === "ACTIVE");
  }, [user?.status]);

  useEffect(() => {
    if (!isEmployee) return;
    const id = window.setTimeout(() => {
      void loadMyProfile();
    }, 0);
    return () => window.clearTimeout(id);
  }, [isEmployee, loadMyProfile, activeTab]);

  useEffect(() => {
    if (activeTab !== "employee") return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await hrmsService.getBands();
          const rows = toRows(response);
          setOnboardBands(rows);

          const departments = Array.from(
            new Set(
              rows
                .map((row) => String(row.stream ?? row.department ?? "").trim())
                .filter((value) => Boolean(value))
            )
          ).sort();
          setOnboardDepartments(
            departments.length ? departments : DEFAULT_DEPARTMENT_OPTIONS
          );
        } catch {
          setOnboardDepartments(DEFAULT_DEPARTMENT_OPTIONS);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "employee") return;
    if (!onboardForm.band_id) {
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const bandId = String(onboardForm.band_id);
          const deptEntries = await Promise.all(
            DEFAULT_DEPARTMENT_OPTIONS.map(async (department) => {
              const response = await hrmsService.getDesignations({
                band_id: bandId,
                department,
              });
              const rows = toRows(response);
              const roles = Array.from(
                new Set(
                  rows
                    .map((row) =>
                      String(row.designation ?? row.role ?? row.name ?? "").trim()
                    )
                    .filter((value) => Boolean(value))
                )
              ).sort();
              return { department, roles };
            })
          );

          const nextMap = deptEntries.reduce<Record<string, string[]>>((acc, item) => {
            if (item.roles.length) acc[item.department] = item.roles;
            return acc;
          }, {});

          const validDepartments = Object.keys(nextMap);
          setBandDeptRoleMap(nextMap);
          setOnboardDepartments(
            validDepartments.length ? validDepartments : DEFAULT_DEPARTMENT_OPTIONS
          );

          const resolvedDepartment = validDepartments.includes(onboardForm.department)
            ? onboardForm.department
            : validDepartments[0] ?? "";
          const resolvedRoles = nextMap[resolvedDepartment] ?? [];

          if (resolvedDepartment !== onboardForm.department || !resolvedRoles.includes(onboardForm.role)) {
            setOnboardForm((prev) => ({
              ...prev,
              department: resolvedDepartment,
              role: resolvedRoles[0] ?? "",
            }));
          }
        } catch {
          setBandDeptRoleMap({});
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, onboardForm.band_id, onboardForm.department, onboardForm.role]);

  useEffect(() => {
    if (activeTab !== "allocation") return;
    const hasAllocationAccess =
      (user?.roles ?? []).includes("ROLE_HR") || (user?.roles ?? []).includes("ROLE_ADMIN");
    if (!hasAllocationAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await hrmsService.getAllocationRoles({});
          const rows = toRows(response.data ?? response);
          const roles = Array.from(
            new Set(
              rows
                .map((row) => String(row.name ?? row.role ?? "").trim())
                .filter(Boolean)
            )
          ).sort();
          setAllocationRoles(roles);
        } catch {
          setAllocationRoles([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, user?.roles]);

  useEffect(() => {
    if (activeTab !== "employee") return;
    if (!hasHrAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getOnboardList({ page: "0", size: "100" });
          setOnboardedUsers(toPagedRows(res.data));
        } catch {
          setOnboardedUsers([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasHrAccess]);

  useEffect(() => {
    if (activeTab !== "projects") return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const [assignedRes, myAllocationsRes] = await Promise.all([
            hrmsService.getAssignedProjects(),
            hrmsService.getMyAllocations(),
          ]);
          const normalizedProjects = normalizeAssignedProjects(
            toPagedRows(assignedRes.data ?? assignedRes)
          );
          const myAllocations = toPagedRows(myAllocationsRes.data ?? myAllocationsRes);
          setAssignedProjects(mergeProjectAndAllocationData(normalizedProjects, myAllocations));
        } catch {
          setAssignedProjects([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab]);

  function applyTheme(nextTheme: "light" | "dark" | "system") {
    const root = document.documentElement;
    if (nextTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", nextTheme);
    }
    window.localStorage.setItem("wt-theme", nextTheme);
  }

  async function runAction(label: string, fn: () => Promise<unknown>) {
    setActionLoading(true);
    try {
      await fn();
      setToast({ type: "success", message: `${label} completed.` });
      if (activeTab === "overview") refresh();
    } catch (error) {
      const backendMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "";
      setToast({
        type: "error",
        message: backendMessage || `Unable to ${label.toLowerCase()}. Please try again.`,
      });
    } finally {
      setActionLoading(false);
    }
  }

  function toRows(input: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(input)) return input as Array<Record<string, unknown>>;
    if (
      input &&
      typeof input === "object" &&
      Array.isArray((input as { items?: unknown[] }).items)
    ) {
      return ((input as { items?: unknown[] }).items ?? []) as Array<Record<string, unknown>>;
    }
    if (
      input &&
      typeof input === "object" &&
      Array.isArray((input as { data?: unknown[] }).data)
    ) {
      return ((input as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
    }
    return [];
  }

  function toPagedRows(input: unknown): Array<Record<string, unknown>> {
    const directRows = toRows(input);
    if (directRows.length) return directRows;
    if (input && typeof input === "object") {
      const dataRows = toRows((input as { data?: unknown }).data);
      if (dataRows.length) return dataRows;
      const nestedDataRows = toRows((input as { data?: { data?: unknown } }).data?.data);
      if (nestedDataRows.length) return nestedDataRows;
      const contentRows = toRows((input as { content?: unknown }).content);
      if (contentRows.length) return contentRows;
    }
    return [];
  }

  function normalizeAssignedProjects(rows: Array<Record<string, unknown>>) {
    return rows.map((row) => {
      const isManagerRaw = row.is_manager ?? row.isManager ?? row.manager ?? null;
      const isManager =
        typeof isManagerRaw === "boolean"
          ? isManagerRaw
            ? "Yes"
            : "No"
          : isManagerRaw === null || isManagerRaw === undefined
            ? "No"
            : String(isManagerRaw);

      return {
        project_code: row.project_code ?? row.projectCode ?? row.code ?? "—",
        project_name: row.project_name ?? row.projectName ?? row.name ?? "—",
        project_type: row.project_type ?? row.projectType ?? "—",
        role: row.role ?? row.designation ?? "—",
        allocated_hours: row.allocated_hours ?? row.allocatedHours ?? row.hours ?? "—",
        is_manager: isManager,
        start_date: row.start_date ?? row.startDate ?? "—",
        end_date: row.end_date ?? row.endDate ?? "—",
      } as Record<string, unknown>;
    });
  }

  function mergeProjectAndAllocationData(
    projectsRows: Array<Record<string, unknown>>,
    allocationRows: Array<Record<string, unknown>>
  ) {
    const allocationByProject = allocationRows.reduce<Record<string, Record<string, unknown>>>(
      (acc, row) => {
        const key = String(row.project_code ?? row.projectCode ?? "").trim();
        if (!key) return acc;
        acc[key] = row;
        return acc;
      },
      {}
    );

    return projectsRows.map((row) => {
      const projectKey = String(row.project_code ?? "").trim();
      const allocation = allocationByProject[projectKey] ?? {};
      return {
        ...row,
        role: row.role === "—" ? allocation.role ?? allocation.designation ?? "—" : row.role,
        allocated_hours:
          row.allocated_hours === "—"
            ? allocation.allocated_hours ?? allocation.allocatedHours ?? allocation.hours ?? "—"
            : row.allocated_hours,
        is_manager:
          row.is_manager === "No" && allocation.is_manager !== undefined
            ? Boolean(allocation.is_manager)
              ? "Yes"
              : "No"
            : row.is_manager,
        start_date:
          row.start_date === "—"
            ? allocation.start_date ?? allocation.startDate ?? "—"
            : row.start_date,
        end_date:
          row.end_date === "—"
            ? allocation.end_date ?? allocation.endDate ?? "—"
            : row.end_date,
      } as Record<string, unknown>;
    });
  }

  const navigation = useMemo(
    () => [
      { id: "overview", label: "Overview", roles: [] as string[] },
      { id: "employee", label: "Employee & Onboarding", roles: ["ROLE_EMPLOYEE", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "allocation", label: "Allocation & Projects", roles: ["ROLE_HR", "ROLE_ADMIN"] },
      { id: "projects", label: "Projects", roles: ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "timelog", label: "Timelog Approvals", roles: ["ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "leave", label: "Leave Requests", roles: ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "uploads", label: "Uploads & Notifications", roles: ["ROLE_HR", "ROLE_ADMIN"] },
      { id: "masters", label: "Masters & Admin", roles: ["ROLE_HR", "ROLE_ADMIN"] },
    ],
    []
  );
  const availableOnboardRoles = bandDeptRoleMap[onboardForm.department] ?? [];
  const loadAllProjectsForHr = useCallback(async () => {
    const res = await hrmsService.getProjects({ page: "0", size: "500" });
    const rows = toRows(res.data);
    if (rows.length) return rows;
    const fallback = await hrmsService.getAllProjects({});
    return toRows(fallback.data ?? fallback);
  }, []);
  const loadAllocationsForHr = useCallback(async () => {
    const res = await hrmsService.getAllocations({ page: "0", size: "200", view: "ALL" });
    let rows = toPagedRows(res.data);
    if (!rows.length) {
      const fallback = await hrmsService.getAllocations({ page: "0", size: "200" });
      rows = toPagedRows(fallback.data);
    }
    setAllocations(rows);
  }, []);
  const filteredProjects = useMemo(() => {
    const search = projectFilters.search.trim().toLowerCase();
    return projects.filter((project) => {
      const typeOk =
        projectFilters.project_type === "ALL" ||
        String(project.project_type ?? "").toUpperCase() === projectFilters.project_type;
      const searchOk =
        !search ||
        String(project.project_code ?? "").toLowerCase().includes(search) ||
        String(project.project_name ?? "").toLowerCase().includes(search);
      return typeOk && searchOk;
    });
  }, [projects, projectFilters]);
  const visibleNavigation = navigation.filter((item) =>
    item.roles.length === 0 ? true : item.roles.some((r) => userRoles.includes(r))
  );

  return (
    <div className="min-h-screen bg-wt-bg text-wt-text">
      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] min-h-screen">
        <aside className="border-r border-wt-border bg-wt-surface-1 p-5">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.14em] text-wt-text-faint">HRMS</p>
            <h1 className="text-lg font-semibold mt-1">WebTrak Portal</h1>
            <p className="text-xs text-wt-text-muted mt-1">{user?.email}</p>
          </div>
          <nav className="space-y-1.5">
            {visibleNavigation.map((item) => {
              const disabled = requiresSelfOnboarding && item.id !== "employee";
              return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!disabled) setActiveTab(item.id);
                }}
                disabled={disabled}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeTab === item.id
                    ? "bg-wt-surface-3 text-wt-text"
                    : disabled
                      ? "text-wt-text-faint opacity-60 cursor-not-allowed"
                      : "text-wt-text-muted hover:bg-wt-surface-2"
                }`}
              >
                {item.label}
              </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex flex-col">
          <header className="border-b border-wt-border px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">HRMS Dashboard</h2>
              <p className="text-xs text-wt-text-muted">Light professional workspace for operations</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={theme}
                onChange={(event) => {
                  const nextTheme = event.target.value as "light" | "dark" | "system";
                  setTheme(nextTheme);
                  applyTheme(nextTheme);
                }}
                className="input-field px-2 py-1.5 text-sm min-w-[120px]"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
              <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={signOut}>
                Sign out
              </button>
            </div>
          </header>

          <main className="p-6 space-y-4">
            {requiresSelfOnboarding ? (
              <section className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 p-4">
                <h3 className="font-semibold">Onboarding pending</h3>
                <p className="text-sm mt-1">
                  Please complete your onboarding form from the Employee &amp; Onboarding tab to unlock full access.
                </p>
              </section>
            ) : null}
            {activeTab === "overview" && !requiresSelfOnboarding ? (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MetricCard label="Total Onboarded" value={metrics.totalOnboarded} loading={loading} />
                  <MetricCard label="Unread Notifications" value={metrics.unreadNotifications} loading={loading} />
                  <MetricCard label="Timelog Records" value={metrics.timelogItems} loading={loading} />
                  <MetricCard label="Leave Records" value={metrics.leaveRecords} loading={loading} />
                </div>
                <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <h3 className="font-semibold mb-1">Operations Snapshot</h3>
                  <p className="text-sm text-wt-text-muted mb-3">
                    Monitor onboarding, approvals, requests, and alerts from one place.
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button type="button" className="btn-primary px-3 py-2" onClick={() => refresh()} disabled={actionLoading}>
                      Refresh Metrics
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-3 py-2"
                      onClick={() => runAction("Mark all notifications read", () => hrmsService.markAllNotificationsRead())}
                      disabled={actionLoading}
                    >
                      Clear Notification Queue
                    </button>
                  </div>
                  {error ? <p className="text-sm mt-3 text-wt-text-muted">Some widgets are temporarily unavailable.</p> : null}
                </section>
              </>
            ) : null}

            {activeTab === "employee" ? (
              <>
                {hasHrAccess ? (
                  <section className="grid xl:grid-cols-[1.2fr_1fr] gap-4">
                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                      <h3 className="font-semibold mb-1">Create New Employee</h3>
                      <p className="text-sm text-wt-text-muted mb-4">Capture core onboarding details used by HR operations.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField label="Employee ID" value={onboardForm.emp_id} onChange={(v) => setOnboardForm((p) => ({ ...p, emp_id: v }))} />
                        <InputField label="Email" value={onboardForm.email} onChange={(v) => setOnboardForm((p) => ({ ...p, email: v }))} />
                        <InputField label="Name" value={onboardForm.name} onChange={(v) => setOnboardForm((p) => ({ ...p, name: v }))} />
                        <SelectField label="User Type" value={onboardForm.user_type} options={["FULLTIME", "INTERN", "CONSULTANT"]} onChange={(v) => setOnboardForm((p) => ({ ...p, user_type: v }))} />
                        <SelectField
                          label="Department"
                          value={onboardForm.department}
                          options={onboardDepartments.length ? onboardDepartments : DEFAULT_DEPARTMENT_OPTIONS}
                          onChange={(v) =>
                            setOnboardForm((p) => ({
                              ...p,
                              department: v,
                            }))
                          }
                        />
                        <InputField label="Phone Number" value={onboardForm.phone_number} onChange={(v) => setOnboardForm((p) => ({ ...p, phone_number: v }))} />
                        <SelectField label="Work Mode" value={onboardForm.work_mode} options={["WFO", "WFH", "HYBRID"]} onChange={(v) => setOnboardForm((p) => ({ ...p, work_mode: v }))} />
                        <SelectField label="Work Location" value={onboardForm.work_location_type} options={["OFFSHORE", "ONSITE", "HYBRID", "REMOTE"]} onChange={(v) => setOnboardForm((p) => ({ ...p, work_location_type: v }))} />
                        <SelectField label="Delivery Status" value={onboardForm.delivery_status} options={["DELIVERABLE", "NON_DELIVERABLE"]} onChange={(v) => setOnboardForm((p) => ({ ...p, delivery_status: v }))} />
                        <SelectField
                          label="Role"
                          value={onboardForm.role}
                          options={availableOnboardRoles.length ? availableOnboardRoles : ["Select band and department first"]}
                          onChange={(v) => setOnboardForm((p) => ({ ...p, role: v }))}
                        />
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Band
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={String(onboardForm.band_id)}
                            onChange={(e) =>
                              setOnboardForm((p) => ({
                                ...p,
                                band_id: Number(e.target.value || "1"),
                                role: "",
                              }))
                            }
                          >
                            {onboardBands.length ? (
                              onboardBands.map((row) => (
                                <option key={String(row.id)} value={String(row.id)}>
                                  {String(row.name ?? row.id ?? "")}
                                </option>
                              ))
                            ) : (
                              <option value="1">B1</option>
                            )}
                          </select>
                        </label>
                        {onboardForm.user_type === "INTERN" ? (
                          <>
                            <InputField label="Date of Internship" value={onboardForm.doi} onChange={(v) => setOnboardForm((p) => ({ ...p, doi: v }))} type="date" />
                            <InputField label="Internship Duration (months)" value={onboardForm.internship_duration} onChange={(v) => setOnboardForm((p) => ({ ...p, internship_duration: v }))} />
                          </>
                        ) : (
                          <InputField label="Date of Joining" value={onboardForm.doj} onChange={(v) => setOnboardForm((p) => ({ ...p, doj: v }))} type="date" />
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction("Create employee", () => {
                              const basePayload = {
                                emp_id: onboardForm.emp_id.trim() || undefined,
                                email: onboardForm.email.trim(),
                                name: onboardForm.name.trim(),
                                user_type: onboardForm.user_type,
                                department: onboardForm.department.trim(),
                                phone_number: onboardForm.phone_number.trim(),
                                work_mode: onboardForm.work_mode,
                                work_location_type: onboardForm.work_location_type,
                                delivery_status: onboardForm.delivery_status,
                                role: onboardForm.role.trim(),
                                band_id: Number(onboardForm.band_id),
                              };

                              if (onboardForm.user_type === "INTERN") {
                                return hrmsService.createOnboard({
                                  ...basePayload,
                                  doi: onboardForm.doi || undefined,
                                  internship_duration: onboardForm.internship_duration
                                    ? Number(onboardForm.internship_duration)
                                    : undefined,
                                });
                              }

                              return hrmsService.createOnboard({
                                ...basePayload,
                                doj: onboardForm.doj || undefined,
                              });
                            })
                          }
                          disabled={actionLoading}
                        >
                          Create Employee
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2"
                          onClick={() =>
                            runAction("Load onboarded users", async () => {
                              const res = await hrmsService.getOnboardList({ page: "0", size: "20" });
                              setOnboardedUsers(toRows(res.data));
                            })
                          }
                          disabled={actionLoading}
                        >
                          Refresh Employee List
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                      <h3 className="font-semibold mb-1">Employee Profile</h3>
                      <p className="text-sm text-wt-text-muted mb-3">Search by employee ID.</p>
                      <InputField label="Employee ID" value={empId} onChange={setEmpId} />
                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction("Fetch employee profile", async () => {
                              const res = await hrmsService.getEmployeeProfile(empId);
                              setEmployeeProfile((res.data ?? null) as Record<string, unknown> | null);
                            })
                          }
                          disabled={actionLoading}
                        >
                          View Profile
                        </button>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                        <ProfileField label="Name" value={employeeProfile?.name} />
                        <ProfileField label="Email" value={employeeProfile?.email} />
                        <ProfileField label="Status" value={employeeProfile?.status} />
                        <ProfileField label="Department" value={employeeProfile?.department} />
                        <ProfileField label="User Type" value={employeeProfile?.user_type} />
                        <ProfileField label="Work Mode" value={employeeProfile?.work_mode} />
                      </dl>
                    </div>
                    <div className="xl:col-span-2 rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                      <h3 className="font-semibold mb-3">Onboarded Employees</h3>
                      <DataTable
                        columns={["emp_id", "name", "email", "status", "user_type", "department"]}
                        rows={onboardedUsers}
                        emptyLabel="No employee records loaded yet."
                      />
                    </div>
                  </section>
                ) : (
                  <section className="grid xl:grid-cols-[1.2fr_1fr] gap-4">
                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                      {requiresSelfOnboarding ? (
                        <>
                          <h3 className="font-semibold mb-1">Complete Your Onboarding</h3>
                          <p className="text-sm text-wt-text-muted mb-4">Employees must complete onboarding before full portal access.</p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <InputField label="Years of Experience" value={selfOnboardForm.yoe} onChange={(v) => setSelfOnboardForm((p) => ({ ...p, yoe: v }))} />
                            <InputField label="Experience Summary" value={selfOnboardForm.experience} onChange={(v) => setSelfOnboardForm((p) => ({ ...p, experience: v }))} />
                            <InputField
                              label="Primary Skills (comma separated)"
                              value={selfOnboardForm.primary_skills}
                              onChange={(v) => setSelfOnboardForm((p) => ({ ...p, primary_skills: v }))}
                            />
                            <InputField
                              label="Secondary Skill"
                              value={selfOnboardForm.secondary_skill}
                              onChange={(v) => setSelfOnboardForm((p) => ({ ...p, secondary_skill: v }))}
                            />
                            <SelectField
                              label="Secondary Skill Rating"
                              value={selfOnboardForm.secondary_rating}
                              options={["1", "2", "3", "4", "5"]}
                              onChange={(v) => setSelfOnboardForm((p) => ({ ...p, secondary_rating: v }))}
                            />
                            <SelectField
                              label="Work Location"
                              value={selfOnboardForm.work_location_type}
                              options={["OFFSHORE", "ONSITE", "HYBRID", "REMOTE"]}
                              onChange={(v) => setSelfOnboardForm((p) => ({ ...p, work_location_type: v }))}
                            />
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3 mt-3">
                            <FileField label="Resume" accept=".pdf,.doc,.docx,image/*" onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, resume: file }))} />
                            <FileField label="Profile Photo" accept="image/*" onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, profile_photo: file }))} />
                            <FileField label="Aadhaar" accept=".pdf,image/*" onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, aadhaar: file }))} />
                            <FileField label="PAN Card" accept=".pdf,image/*" onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, pan_card: file }))} />
                          </div>
                          <div className="mt-4">
                            <button
                              type="button"
                              className="btn-primary px-3 py-2"
                              onClick={() =>
                                runAction("Submit onboarding", async () => {
                                  if (!user?.email) {
                                    throw new Error("Unable to resolve logged-in email.");
                                  }
                                  const fd = new FormData();
                                  const primarySkills = selfOnboardForm.primary_skills
                                    .split(",")
                                    .map((item) => item.trim())
                                    .filter(Boolean);
                                  if (!primarySkills.length) {
                                    throw new Error("Please add at least one primary skill.");
                                  }
                                  if (!selfOnboardFiles.resume) {
                                    throw new Error("Please upload resume.");
                                  }
                                  if (!selfOnboardFiles.profile_photo) {
                                    throw new Error("Please upload profile photo.");
                                  }
                                  if (!selfOnboardFiles.aadhaar) {
                                    throw new Error("Please upload Aadhaar.");
                                  }
                                  if (!selfOnboardFiles.pan_card) {
                                    throw new Error("Please upload PAN card.");
                                  }
                                  if (
                                    selfOnboardFiles.profile_photo.type &&
                                    !selfOnboardFiles.profile_photo.type.startsWith("image/")
                                  ) {
                                    throw new Error("Profile photo must be an image file (jpg/png/webp).");
                                  }
                                  const selectedFiles = Object.entries(selfOnboardFiles).filter(
                                    (entry): entry is [string, File] => Boolean(entry[1])
                                  );
                                  for (const [key, file] of selectedFiles) {
                                    if (file.size > MAX_ONBOARD_FILE_BYTES) {
                                      throw new Error(
                                        `${key.replaceAll("_", " ")} exceeds 2 MB. Please upload a smaller file.`
                                      );
                                    }
                                  }
                                  const totalBytes = selectedFiles.reduce(
                                    (sum, [, file]) => sum + file.size,
                                    0
                                  );
                                  if (totalBytes > MAX_ONBOARD_TOTAL_BYTES) {
                                    throw new Error(
                                      "Total upload size exceeds 6 MB. Compress files and retry."
                                    );
                                  }
                                  fd.append(
                                    "user_data",
                                    JSON.stringify({
                                      email: user.email,
                                      yoe: selfOnboardForm.yoe ? Number(selfOnboardForm.yoe) : null,
                                      experience: selfOnboardForm.experience || null,
                                      primary_skills: primarySkills,
                                      secondary_skills: selfOnboardForm.secondary_skill
                                        ? [
                                            {
                                              skill: selfOnboardForm.secondary_skill.trim(),
                                              rating: Number(selfOnboardForm.secondary_rating),
                                            },
                                          ]
                                        : [],
                                      work_location_type: selfOnboardForm.work_location_type,
                                    })
                                  );
                                  Object.entries(selfOnboardFiles).forEach(([key, file]) => {
                                    if (file) fd.append(key, file);
                                  });
                                  await hrmsService.completeMyOnboarding(fd);
                                  setSelfOnboardForm({
                                    yoe: "",
                                    experience: "",
                                    primary_skills: "",
                                    secondary_skill: "",
                                    secondary_rating: "3",
                                    work_location_type: "OFFSHORE",
                                  });
                                  setSelfOnboardFiles({
                                    resume: null,
                                    profile_photo: null,
                                    aadhaar: null,
                                    pan_card: null,
                                  });
                                  setIsSelfOnboarded(true);
                                  await refreshSession();
                                  await loadMyProfile();
                                })
                              }
                              disabled={actionLoading}
                            >
                              Submit Onboarding Form
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="font-semibold mb-1">Edit My Profile</h3>
                          <p className="text-sm text-wt-text-muted mb-4">You are onboarded. Update your profile details anytime.</p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <InputField label="Phone Number" value={selfProfileForm.phone_number} onChange={(v) => setSelfProfileForm((p) => ({ ...p, phone_number: v }))} />
                            <SelectField label="Work Mode" value={selfProfileForm.work_mode} options={["WFO", "WFH", "HYBRID"]} onChange={(v) => setSelfProfileForm((p) => ({ ...p, work_mode: v }))} />
                            <InputField label="Primary Skills (comma separated)" value={selfProfileForm.primary_skills} onChange={(v) => setSelfProfileForm((p) => ({ ...p, primary_skills: v }))} />
                            <InputField label="Secondary Skill" value={selfProfileForm.secondary_skill} onChange={(v) => setSelfProfileForm((p) => ({ ...p, secondary_skill: v }))} />
                            <SelectField label="Secondary Skill Rating" value={selfProfileForm.secondary_rating} options={["1", "2", "3", "4", "5"]} onChange={(v) => setSelfProfileForm((p) => ({ ...p, secondary_rating: v }))} />
                            <InputField label="Experience Summary" value={selfProfileForm.experience} onChange={(v) => setSelfProfileForm((p) => ({ ...p, experience: v }))} />
                            <InputField label="Years of Experience" value={selfProfileForm.yoe} onChange={(v) => setSelfProfileForm((p) => ({ ...p, yoe: v }))} />
                            <SelectField label="Work Location" value={selfProfileForm.work_location_type} options={["OFFSHORE", "ONSITE", "HYBRID", "REMOTE"]} onChange={(v) => setSelfProfileForm((p) => ({ ...p, work_location_type: v }))} />
                          </div>
                          <div className="mt-3">
                            <FileField label="Profile Picture (optional)" accept="image/*" onPick={setSelfProfilePic} />
                          </div>
                          <div className="mt-4">
                            <button
                              type="button"
                              className="btn-primary px-3 py-2"
                              onClick={() =>
                                runAction("Update my profile", async () => {
                                  const fd = new FormData();
                                  fd.append(
                                    "body",
                                    JSON.stringify({
                                      phone_number: selfProfileForm.phone_number || null,
                                      work_mode: selfProfileForm.work_mode || null,
                                      primary_skills: selfProfileForm.primary_skills
                                        .split(",")
                                        .map((item) => item.trim())
                                        .filter(Boolean),
                                      secondary_skills: selfProfileForm.secondary_skill
                                        ? [
                                            {
                                              skill: selfProfileForm.secondary_skill.trim(),
                                              rating: Number(selfProfileForm.secondary_rating),
                                            },
                                          ]
                                        : [],
                                      experience: selfProfileForm.experience || null,
                                      yoe: selfProfileForm.yoe ? Number(selfProfileForm.yoe) : null,
                                      work_location_type: selfProfileForm.work_location_type || null,
                                    })
                                  );
                                  if (selfProfilePic) {
                                    fd.append("profilePic", selfProfilePic);
                                  }
                                  await hrmsService.updateMyProfile(fd);
                                  setSelfProfileForm({
                                    phone_number: "",
                                    work_mode: "WFO",
                                    primary_skills: "",
                                    secondary_skill: "",
                                    secondary_rating: "3",
                                    experience: "",
                                    yoe: "",
                                    work_location_type: "OFFSHORE",
                                  });
                                  setSelfProfilePic(null);
                                })
                              }
                              disabled={actionLoading}
                            >
                              Save Profile Changes
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                      <h3 className="font-semibold mb-1">My Profile Snapshot</h3>
                      <p className="text-sm text-wt-text-muted mb-3">Use this to verify your onboarding details.</p>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        onClick={() =>
                          runAction("Load my profile", async () => loadMyProfile())
                        }
                        disabled={actionLoading}
                      >
                        Refresh My Profile
                      </button>
                      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                        <ProfileField label="Name" value={employeeProfile?.name} />
                        <ProfileField label="Email" value={employeeProfile?.email} />
                        <ProfileField label="Status" value={employeeProfile?.status} />
                        <ProfileField label="Department" value={employeeProfile?.department} />
                        <ProfileField label="User Type" value={employeeProfile?.user_type} />
                        <ProfileField label="Work Mode" value={employeeProfile?.work_mode} />
                      </dl>
                    </div>
                  </section>
                )}
              </>
            ) : null}

            {activeTab === "allocation" && !requiresSelfOnboarding ? (
              <>
                {hasHrAccess ? (
                  <section className="grid xl:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                      <h3 className="font-semibold">Project CRUD</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField label="Project Code" value={projectForm.project_code} onChange={(v) => setProjectForm((p) => ({ ...p, project_code: v }))} />
                        <InputField label="Project Name" value={projectForm.project_name} onChange={(v) => setProjectForm((p) => ({ ...p, project_name: v }))} />
                        <SelectField
                          label="Project Type"
                          value={projectForm.project_type}
                          options={["IN_HOUSE", "STAFFING", "PRODUCT"]}
                          onChange={(v) => setProjectForm((p) => ({ ...p, project_type: v }))}
                        />
                        <InputField label="Delete Project Code" value={projectCodeToDelete} onChange={setProjectCodeToDelete} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction("Create project", () =>
                              hrmsService.createProject({
                                project_code: projectForm.project_code.trim(),
                                project_name: projectForm.project_name.trim(),
                                project_type: projectForm.project_type,
                              })
                            )
                          }
                          disabled={actionLoading}
                        >
                          Create Project
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2"
                          onClick={() =>
                            runAction("Update project", () =>
                              hrmsService.updateProject(projectForm.project_code.trim(), {
                                project_code: projectForm.project_code.trim(),
                                project_name: projectForm.project_name.trim(),
                                project_type: projectForm.project_type,
                              })
                            )
                          }
                          disabled={actionLoading}
                        >
                          Update Project
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2"
                          onClick={() => runAction("Delete project", () => hrmsService.deleteProject(projectCodeToDelete.trim()))}
                          disabled={actionLoading}
                        >
                          Delete Project
                        </button>
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction("Load projects", async () => {
                              const rows = await loadAllProjectsForHr();
                              setProjects(rows);
                              setProjectFilters({ search: "", project_type: "ALL" });
                            })
                          }
                          disabled={actionLoading}
                        >
                          Refresh Projects
                        </button>
                      </div>
                      <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-3">
                        <p className="text-sm font-medium">All Projects</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <InputField
                            label="Search by code or name"
                            value={projectFilters.search}
                            onChange={(v) =>
                              setProjectFilters((p) => ({
                                ...p,
                                search: v,
                              }))
                            }
                          />
                          <SelectField
                            label="Type Filter"
                            value={projectFilters.project_type}
                            options={["ALL", "IN_HOUSE", "STAFFING", "PRODUCT"]}
                            onChange={(v) =>
                              setProjectFilters((p) => ({
                                ...p,
                                project_type: v,
                              }))
                            }
                          />
                        </div>
                        <DataTable columns={["project_code", "project_name", "project_type", "status"]} rows={filteredProjects} emptyLabel="No projects match current filters." />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                      <h3 className="font-semibold">Employee Allocation Form</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <InputField label="Allocation ID (for update/delete)" value={allocationForm.allocation_id} onChange={(v) => setAllocationForm((p) => ({ ...p, allocation_id: v }))} />
                        <InputField label="Employee Email" value={allocationForm.employee_email} onChange={(v) => setAllocationForm((p) => ({ ...p, employee_email: v }))} />
                        <InputField label="Project Code" value={allocationForm.project_code} onChange={(v) => setAllocationForm((p) => ({ ...p, project_code: v }))} />
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Role
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={allocationForm.role}
                            onChange={(e) =>
                              setAllocationForm((p) => ({
                                ...p,
                                role: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select role</option>
                            {allocationRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </label>
                        <InputField label="Allocated Hours (1-8)" value={allocationForm.allocated_hours} onChange={(v) => setAllocationForm((p) => ({ ...p, allocated_hours: v }))} />
                        <SelectField label="Allocation Type" value={allocationForm.allocation_type} options={["DEPLOYABLE", "STAFFING", "NONDEPLOYABLE", "NONBILLABLE", "LOCKED"]} onChange={(v) => setAllocationForm((p) => ({ ...p, allocation_type: v }))} />
                        <InputField label="Start Date" value={allocationForm.start_date} onChange={(v) => setAllocationForm((p) => ({ ...p, start_date: v }))} type="date" />
                        <InputField label="End Date" value={allocationForm.end_date} onChange={(v) => setAllocationForm((p) => ({ ...p, end_date: v }))} type="date" />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-wt-text-muted">
                        <input
                          type="checkbox"
                          checked={allocationForm.is_manager}
                          onChange={(e) => setAllocationForm((p) => ({ ...p, is_manager: e.target.checked }))}
                        />
                        Manager checklist (`is_manager`) - if checked employee becomes manager
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction("Create allocation", async () => {
                              await hrmsService.createAllocation({
                                employee_email: allocationForm.employee_email.trim(),
                                project_code: allocationForm.project_code.trim(),
                                role: allocationForm.role.trim() || null,
                                allocated_hours: Number(allocationForm.allocated_hours),
                                start_date: allocationForm.start_date,
                                end_date: allocationForm.end_date || null,
                                allocation_type: allocationForm.allocation_type,
                                is_manager: allocationForm.is_manager,
                              });
                              setAllocationForm({
                                allocation_id: "",
                                employee_email: "",
                                project_code: "",
                                role: "",
                                allocated_hours: "8",
                                start_date: "",
                                end_date: "",
                                allocation_type: "DEPLOYABLE",
                                is_manager: false,
                              });
                              await loadAllocationsForHr();
                            })
                          }
                          disabled={actionLoading}
                        >
                          Allocate Employee
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2"
                          onClick={() =>
                            runAction("Update allocation", () =>
                              hrmsService.updateAllocation(allocationForm.allocation_id.trim(), {
                                employee_email: allocationForm.employee_email.trim(),
                                project_code: allocationForm.project_code.trim(),
                                role: allocationForm.role.trim() || null,
                                allocated_hours: Number(allocationForm.allocated_hours),
                                start_date: allocationForm.start_date || null,
                                end_date: allocationForm.end_date || null,
                                allocation_type: allocationForm.allocation_type,
                                is_manager: allocationForm.is_manager,
                              })
                            )
                          }
                          disabled={actionLoading}
                        >
                          Update Allocation
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2"
                          onClick={() => runAction("Delete allocation", () => hrmsService.deleteAllocation(allocationForm.allocation_id.trim()))}
                          disabled={actionLoading}
                        >
                          Delete Allocation
                        </button>
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction("Load allocations", loadAllocationsForHr)
                          }
                          disabled={actionLoading}
                        >
                          Refresh Allocations
                        </button>
                      </div>
                      <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Allocation Records</p>
                          <span className="text-xs text-wt-text-muted">{allocations.length} row(s)</span>
                        </div>
                        <DataTable columns={["id", "employee_email", "project_code", "role", "allocated_hours", "allocation_type", "is_manager", "start_date", "end_date"]} rows={allocations} emptyLabel="No allocations loaded." />
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <p className="text-sm text-wt-text-muted">
                      Allocation management is available for HR/Admin. Use the Projects tab to view assigned projects.
                    </p>
                  </section>
                )}
              </>
            ) : null}

            {activeTab === "projects" && !requiresSelfOnboarding ? (
              <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">My Allocated Projects</h3>
                  <button
                    type="button"
                    className="btn-primary px-3 py-2"
                    onClick={() =>
                      runAction("Load assigned projects", async () => {
                        const [assignedRes, myAllocationsRes] = await Promise.all([
                          hrmsService.getAssignedProjects(),
                          hrmsService.getMyAllocations(),
                        ]);
                        const normalizedProjects = normalizeAssignedProjects(
                          toPagedRows(assignedRes.data ?? assignedRes)
                        );
                        const myAllocations = toPagedRows(myAllocationsRes.data ?? myAllocationsRes);
                        setAssignedProjects(
                          mergeProjectAndAllocationData(normalizedProjects, myAllocations)
                        );
                      })
                    }
                    disabled={actionLoading}
                  >
                    Refresh
                  </button>
                </div>
                <DataTable
                  columns={["project_code", "project_name", "project_type", "role", "allocated_hours", "is_manager", "start_date", "end_date"]}
                  rows={assignedProjects}
                  emptyLabel="No projects are allocated to you yet."
                />
              </section>
            ) : null}

            {activeTab === "timelog" && !requiresSelfOnboarding ? (
              <section className="grid xl:grid-cols-[1.2fr_1fr] gap-4">
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Timelog Entries</h3>
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={() =>
                        runAction("Load timelogs", async () => {
                          const res = await hrmsService.getTimelogs({ page: "0", size: "20" });
                          setTimelogs(toRows(res.data));
                        })
                      }
                      disabled={actionLoading}
                    >
                      Refresh
                    </button>
                  </div>
                  <DataTable columns={["project_code", "employee_email", "log_date", "hours", "status"]} rows={timelogs} emptyLabel="No timelogs loaded." />
                </div>

                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <h3 className="font-semibold mb-1">Approve Timelog</h3>
                  <p className="text-sm text-wt-text-muted mb-3">Update single timelog status.</p>
                  <div className="space-y-2">
                    <InputField label="Timelog ID" value={timelogApproval.timelog_id} onChange={(v) => setTimelogApproval((p) => ({ ...p, timelog_id: v }))} />
                    <SelectField label="Status" value={timelogApproval.status} options={["APPROVED", "REJECTED"]} onChange={(v) => setTimelogApproval((p) => ({ ...p, status: v }))} />
                    <InputField label="Comment" value={timelogApproval.manager_comment} onChange={(v) => setTimelogApproval((p) => ({ ...p, manager_comment: v }))} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={() =>
                        runAction("Update timelog status", () =>
                          apiClient.put(endpoints.timelog.status, {
                            contentType: "application/json",
                            body: JSON.stringify({
                              timelog_id: Number(timelogApproval.timelog_id),
                              status: timelogApproval.status,
                              manager_comment: timelogApproval.manager_comment || null,
                            }),
                          })
                        )
                      }
                      disabled={actionLoading}
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-3 py-2"
                      onClick={() =>
                        runAction("Export timelog CSV", () =>
                          apiClient.get(endpoints.timelog.export, {
                            query: { startDate: "2026-01-01", endDate: "2026-01-31", format: "csv" },
                            responseType: "blob",
                          })
                        )
                      }
                      disabled={actionLoading}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === "leave" && !requiresSelfOnboarding ? (
              <section className={`grid gap-4 ${hasHrAccess ? "xl:grid-cols-[1fr_1.2fr]" : "xl:grid-cols-1"}`}>
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <h3 className="font-semibold mb-1">Create Leave Request</h3>
                  <p className="text-sm text-wt-text-muted mb-3">Submit leave or work-from-home request.</p>
                  <div className="space-y-2">
                    <InputField label="From Date" value={leaveRequestForm.request_from_date} onChange={(v) => setLeaveRequestForm((p) => ({ ...p, request_from_date: v }))} type="date" />
                    <InputField label="To Date" value={leaveRequestForm.request_to_date} onChange={(v) => setLeaveRequestForm((p) => ({ ...p, request_to_date: v }))} type="date" />
                    <SelectField label="Request Type" value={leaveRequestForm.request_type} options={["LEAVE", "WFH", "COMP_OFF"]} onChange={(v) => setLeaveRequestForm((p) => ({ ...p, request_type: v }))} />
                    <InputField label="Comments" value={leaveRequestForm.comments} onChange={(v) => setLeaveRequestForm((p) => ({ ...p, comments: v }))} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={() =>
                        runAction("Create leave request", () =>
                          apiClient.post(endpoints.userRequest.root, {
                            contentType: "application/json",
                            body: JSON.stringify({
                              ...leaveRequestForm,
                              is_half_day: leaveRequestForm.is_half_day,
                            }),
                          })
                        )
                      }
                      disabled={actionLoading}
                    >
                      Submit Request
                    </button>
                  </div>
                </div>

                {hasHrAccess ? (
                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Leave Summary</h3>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        onClick={() =>
                          runAction("Load leave summary", async () => {
                            const res = await hrmsService.getLeaveSummary({ page: "0", size: "20" });
                            const rows = toRows((res.data as { data?: unknown[] })?.data);
                            setLeaveSummary(rows);
                          })
                        }
                        disabled={actionLoading}
                      >
                        Refresh
                      </button>
                    </div>
                    <DataTable columns={["name", "email", "type", "band", "leaves", "lop"]} rows={leaveSummary} emptyLabel="No leave data loaded." />
                  </div>
                ) : null}
              </section>
            ) : null}

            {activeTab === "uploads" && !requiresSelfOnboarding ? (
              <section className="grid xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <h3 className="font-semibold mb-1">Bulk Upload Center</h3>
                  <p className="text-sm text-wt-text-muted mb-3">Upload HR files in supported Excel formats.</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <UploadTile
                      label="Leave Upload"
                      file={uploadFiles.leave}
                      onPick={(f) => setUploadFiles((p) => ({ ...p, leave: f }))}
                      onUpload={() => uploadFiles.leave ? runAction("Upload leave file", () => hrmsService.uploadFile(endpoints.upload.leave, uploadFiles.leave!)) : Promise.resolve()}
                      loading={actionLoading}
                    />
                    <UploadTile
                      label="Allocation Upload"
                      file={uploadFiles.allocation}
                      onPick={(f) => setUploadFiles((p) => ({ ...p, allocation: f }))}
                      onUpload={() => uploadFiles.allocation ? runAction("Upload allocation file", () => hrmsService.uploadFile(endpoints.upload.allocation, uploadFiles.allocation!)) : Promise.resolve()}
                      loading={actionLoading}
                    />
                    <UploadTile
                      label="User Data Upload"
                      file={uploadFiles.userData}
                      onPick={(f) => setUploadFiles((p) => ({ ...p, userData: f }))}
                      onUpload={() => uploadFiles.userData ? runAction("Upload user-data file", () => hrmsService.uploadFile(endpoints.upload.userData, uploadFiles.userData!)) : Promise.resolve()}
                      loading={actionLoading}
                    />
                    <UploadTile
                      label="User Batch Upload"
                      file={uploadFiles.batch}
                      onPick={(f) => setUploadFiles((p) => ({ ...p, batch: f }))}
                      onUpload={() => uploadFiles.batch ? runAction("Upload user-batch file", () => hrmsService.uploadFile(endpoints.user.batch, uploadFiles.batch!)) : Promise.resolve()}
                      loading={actionLoading}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Notification Center</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-ghost px-3 py-2"
                        onClick={() =>
                          runAction("Load notifications", async () => {
                            const res = await hrmsService.getNotifications({ page: "0", size: "20" });
                            setNotifications(toRows(res.data));
                          })
                        }
                        disabled={actionLoading}
                      >
                        Refresh
                      </button>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        onClick={() => runAction("Mark all notifications read", () => hrmsService.markAllNotificationsRead())}
                        disabled={actionLoading}
                      >
                        Mark All Read
                      </button>
                    </div>
                  </div>
                  <DataTable columns={["title", "message", "is_read", "created_at"]} rows={notifications} emptyLabel="No notifications loaded." />
                </div>
              </section>
            ) : null}

            {activeTab === "masters" && !requiresSelfOnboarding ? (
              <section className="grid xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Band Master</h3>
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={() =>
                        runAction("Load bands", async () => {
                          const res = await hrmsService.getBands();
                          setBands(toRows(res));
                        })
                      }
                      disabled={actionLoading}
                    >
                      Refresh
                    </button>
                  </div>
                  <DataTable columns={["id", "name", "stream", "designation"]} rows={bands} emptyLabel="No band data loaded." />
                </div>
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">KPI Definitions</h3>
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={() =>
                        runAction("Load KPI definitions", async () => {
                          const res = await hrmsService.getKpis({ limit: "20", offset: "0" });
                          setKpis(toRows((res as { data?: unknown[] }).data ?? res));
                        })
                      }
                      disabled={actionLoading}
                    >
                      Refresh
                    </button>
                  </div>
                  <DataTable columns={["kpi_name", "designation", "department", "weightage", "active"]} rows={kpis} emptyLabel="No KPI data loaded." />
                  <div className="mt-4">
                    <button
                      type="button"
                      className="btn-ghost px-3 py-2"
                      onClick={() => runAction("Run scheduler", () => hrmsService.triggerScheduler())}
                      disabled={actionLoading}
                    >
                      Run Scheduler
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
      {toast ? (
        <div className="fixed right-5 bottom-5 z-50">
          <div
            className={`rounded-xl px-4 py-3 text-sm shadow-lg border ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <article className="rounded-2xl border border-wt-border bg-wt-surface-1 p-4">
      <p className="text-xs text-wt-text-muted">{label}</p>
      <p className="text-2xl mt-1 font-semibold">{loading ? "..." : value}</p>
    </article>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <input className="input-field px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} type={type} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <select className="input-field px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function FileField({
  label,
  onPick,
  accept,
}: {
  label: string;
  onPick: (file: File | null) => void;
  accept?: string;
}) {
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <input
        type="file"
        accept={accept}
        className="input-field px-3 py-2 text-sm"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function UploadTile({
  label,
  file,
  onPick,
  onUpload,
  loading,
}: {
  label: string;
  file: File | null;
  onPick: (file: File | null) => void;
  onUpload: () => void | Promise<void>;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <input type="file" className="input-field px-2 py-1.5 text-sm" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      <p className="text-xs text-wt-text-muted truncate">{file ? file.name : "No file selected"}</p>
      <button type="button" className="btn-primary px-2.5 py-1.5 text-sm" onClick={onUpload} disabled={loading || !file}>
        Upload
      </button>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: unknown }) {
  return (
    <>
      <dt className="text-wt-text-muted">{label}</dt>
      <dd className="font-medium">{value ? String(value) : "—"}</dd>
    </>
  );
}

function DataTable({
  columns,
  rows,
  emptyLabel,
}: {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  emptyLabel: string;
}) {
  if (!rows.length) {
    return <p className="text-sm text-wt-text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-auto rounded-xl border border-wt-border">
      <table className="min-w-full text-sm">
        <thead className="bg-wt-surface-2 text-wt-text-muted">
          <tr>
            {columns.map((col) => (
              <th key={col} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                {col.replaceAll("_", " ").toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-wt-border">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 whitespace-nowrap">
                  {row[col] === null || row[col] === undefined ? "—" : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
