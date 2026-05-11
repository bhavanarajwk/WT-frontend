"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/src/api/httpClient";
import { endpoints } from "@/src/api/endpoints";
import { hrmsService } from "@/src/services/hrms.service";
import { useOverviewData } from "@/src/hooks/useOverviewData";
import { ApiError } from "@/src/api/error";
import { WebTrakBrand } from "@/app/components/WebTrakBrand";

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

function IconUser({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5z" />
    </svg>
  );
}

function IconPencil({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconTrash({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
    </svg>
  );
}

function IconSettings({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.52-.4-1.08-.73-1.69-.98l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.61.25-1.17.59-1.69.98l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.52.4 1.08.73 1.69.98l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.61-.25 1.17-.59 1.69-.98l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

function DashboardPageContent() {
  const { user, signOut, refresh: refreshSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { metrics, loading, refresh } = useOverviewData();
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
  const allocationRecordsRef = useRef<HTMLDivElement>(null);
  const projectCrudFormRef = useRef<HTMLDivElement>(null);
  const allocationFormRef = useRef<HTMLDivElement>(null);
  const [allocationRoles, setAllocationRoles] = useState<string[]>([]);
  const [allocationUsers, setAllocationUsers] = useState<Array<{ name: string; email: string }>>([]);
  const [allocationProjects, setAllocationProjects] = useState<Array<{ code: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [assignedProjects, setAssignedProjects] = useState<Array<Record<string, unknown>>>([]);
  const [timelogs, setTimelogs] = useState<Array<Record<string, unknown>>>([]);
  const [leaveSummary, setLeaveSummary] = useState<Array<Record<string, unknown>>>([]);
  const [myLeaveRequests, setMyLeaveRequests] = useState<Array<Record<string, unknown>>>([]);
  const [employeeRequests, setEmployeeRequests] = useState<Array<Record<string, unknown>>>([]);
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
  const [editingLeaveRequestId, setEditingLeaveRequestId] = useState<string>("");
  const [employeeRequestFilters, setEmployeeRequestFilters] = useState({
    fromDate: "",
    toDate: "",
    requestType: "LEAVE",
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
    primary_skills: "",
    secondary_skill: "",
    secondary_rating: "3",
    work_location_type: "OFFSHORE",
  });
  const [selfOnboardFiles, setSelfOnboardFiles] = useState<{
    resume: File | null;
    profile_photo: File | null;
    aadhaar: File | null;
    pan_card: File | null;
    reliving_letter: File | null;
    salary_slips: File[];
  }>({
    resume: null,
    profile_photo: null,
    aadhaar: null,
    pan_card: null,
    reliving_letter: null,
    salary_slips: [],
  });
  const [selfProfileForm, setSelfProfileForm] = useState({
    phone_number: "",
    primary_skills: "",
    secondary_skill: "",
    secondary_rating: "3",
    yoe: "",
  });
  const [selfProfileEmploymentFiles, setSelfProfileEmploymentFiles] = useState<{
    reliving_letter: File | null;
    salary_slips: File[];
  }>({
    reliving_letter: null,
    salary_slips: [],
  });
  const [selfProfilePic, setSelfProfilePic] = useState<File | null>(null);
  const priorEmploymentDocsForProfile = useMemo(() => {
    const raw = String(selfProfileForm.yoe ?? "").trim().replace(",", ".");
    if (!raw) return false;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0;
  }, [selfProfileForm.yoe]);
  const [isSelfOnboarded, setIsSelfOnboarded] = useState<boolean>(user?.status === "ACTIVE");
  const [projectForm, setProjectForm] = useState({
    project_code: "",
    project_name: "",
    project_type: "IN_HOUSE",
  });
  const [editingProjectCode, setEditingProjectCode] = useState<string>("");
  const [projectFilters, setProjectFilters] = useState({
    search: "",
    project_type: "ALL",
  });
  const [projectBulkJson, setProjectBulkJson] = useState(
    '[\n  { "project_code": "DEMO-01", "project_name": "Demo Project", "project_type": "IN_HOUSE" }\n]'
  );
  const [managerPortfolioRows, setManagerPortfolioRows] = useState<Array<Record<string, unknown>>>([]);
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
  const [editingAllocationId, setEditingAllocationId] = useState<string>("");
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasAdminAccess = userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = userRoles.includes("ROLE_MANAGER");
  const isEmployee = userRoles.includes("ROLE_EMPLOYEE");
  const restrictForPendingOnboarding =
    isEmployee && !hasHrAccess && !hasManagerAccess;
  const requiresSelfOnboarding = restrictForPendingOnboarding && !isSelfOnboarded;
  /** Self-service profile + onboarding (non-HR employees only) */
  const employeeSelfServeProfile = isEmployee && !hasHrAccess;

  const priorEmploymentDocsRequired = useMemo(() => {
    const raw = String(selfOnboardForm.yoe ?? "").trim().replace(",", ".");
    if (!raw) return false;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0;
  }, [selfOnboardForm.yoe]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" && !employeeSelfServeProfile) {
      router.replace("/dashboard", { scroll: false });
      return;
    }
    if (tab === "profile" && employeeSelfServeProfile) {
      setActiveTab("profile");
    }
  }, [searchParams, employeeSelfServeProfile, router]);

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
          const [response, onboardRes, projectRes] = await Promise.all([
            hrmsService.getAllocationRoles({}),
            hrmsService.getOnboardList({ page: "0", size: "10" }),
            hrmsService.getProjects({ page: "0", size: "10" }),
          ]);
          const rows = toRows(response.data ?? response);
          const roles = Array.from(
            new Set(
              rows
                .map((row) => String(row.name ?? row.role ?? "").trim())
                .filter(Boolean)
            )
          ).sort();
          setAllocationRoles(roles);
          const userRows = toPagedRows(onboardRes.data ?? onboardRes);
          const users = Array.from(
            new Map(
              userRows
                .map((row) => {
                  const email = String(row.email ?? "").trim();
                  const name = String(row.name ?? email).trim();
                  if (!email) return null;
                  return [email.toLowerCase(), { name, email }] as const;
                })
                .filter((x): x is readonly [string, { name: string; email: string }] => Boolean(x))
            ).values()
          );
          setAllocationUsers(users);
          let projectRows = toRows(projectRes.data);
          if (!projectRows.length) {
            const fallback = await hrmsService.getAllProjects({});
            projectRows = toRows(fallback.data ?? fallback);
          }
          const projects = Array.from(
            new Map(
              projectRows
                .map((row) => {
                  const code = String(row.project_code ?? row.projectCode ?? "").trim();
                  const name = String(row.project_name ?? row.projectName ?? code).trim();
                  if (!code) return null;
                  return [code, { code, name }] as const;
                })
                .filter((x): x is readonly [string, { code: string; name: string }] => Boolean(x))
            ).values()
          ).sort((a, b) => a.name.localeCompare(b.name));
          setAllocationProjects(projects);
        } catch {
          setAllocationRoles([]);
          setAllocationUsers([]);
          setAllocationProjects([]);
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
          const res = await hrmsService.getOnboardList({ page: "0", size: "10" });
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

  useEffect(() => {
    if (activeTab !== "projects" || !hasManagerAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getManagerProjectsWithRoles();
          setManagerPortfolioRows(toPagedRows(res.data ?? res));
        } catch {
          setManagerPortfolioRows([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, hasManagerAccess]);

  useEffect(() => {
    if (activeTab !== "leave") return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          await loadMyLeaveRequests();
        } catch {
          setMyLeaveRequests([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, user]);

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
    if (!input || typeof input !== "object") return [];
    const o = input as Record<string, unknown>;
    // Prefer non-empty `allocations` before `data`: some paginated responses include both,
    // and an empty `data: []` or partial `data` rows would otherwise hide full allocation rows.
    if (Array.isArray(o.items) && o.items.length) {
      return o.items as Array<Record<string, unknown>>;
    }
    if (Array.isArray(o.allocations) && o.allocations.length) {
      return o.allocations as Array<Record<string, unknown>>;
    }
    if (Array.isArray(o.data) && o.data.length) {
      return o.data as Array<Record<string, unknown>>;
    }
    if (Array.isArray(o.content) && o.content.length) {
      return o.content as Array<Record<string, unknown>>;
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

  function buildUserIdToNameMap(users: Array<Record<string, unknown>>) {
    const map: Record<string, string> = {};
    for (const u of users) {
      const name = String(u.name ?? "").trim();
      if (!name) continue;
      for (const key of ["id", "user_id", "userId", "userID", "emp_id"] as const) {
        const v = u[key];
        if (v != null && v !== "") map[String(v)] = name;
      }
    }
    return map;
  }

  function buildEmailToNameMap(users: Array<Record<string, unknown>>) {
    const map: Record<string, string> = {};
    for (const u of users) {
      const email = String(u.email ?? "").trim().toLowerCase();
      const name = String(u.name ?? "").trim();
      if (email && name) map[email] = name;
    }
    return map;
  }

  function allocationRowEmail(row: Record<string, unknown>) {
    return String(
      row.employee_email ??
        row.employeeEmail ??
        row.user_email ??
        row.userEmail ??
        row.email ??
        ""
    )
      .trim()
      .toLowerCase();
  }

  /** Raw project code from allocation row (may be empty). */
  function allocationProjectCode(row: Record<string, unknown>): string {
    const direct =
      row.project_code ??
      row.projectCode ??
      row.project_id ??
      row.projectId ??
      row.proj_code ??
      row.projCode;
    if (direct != null && direct !== "") return String(direct).trim();
    for (const key of Object.keys(row)) {
      const norm = key.toLowerCase().replace(/-/g, "_");
      if (
        norm === "project_code" ||
        norm === "project_id" ||
        norm === "projectcode" ||
        norm === "projectid"
      ) {
        const v = row[key];
        if (v != null && v !== "") return String(v).trim();
      }
    }
    return "";
  }

  function allocationProjectTitleFromRow(row: Record<string, unknown>) {
    return String(
      row.project_name ?? row.projectName ?? row.project_title ?? row.projectTitle ?? ""
    ).trim();
  }

  function buildProjectCodeDisplayMap(projectRows: Array<Record<string, unknown>>) {
    const map: Record<string, string> = {};
    for (const p of projectRows) {
      const code = String(p.project_code ?? p.projectCode ?? "").trim();
      if (!code) continue;
      const name = String(p.project_name ?? p.projectName ?? "").trim();
      map[code] = name ? `${code} — ${name}` : code;
    }
    return map;
  }

  function enrichAllocationRowsForDisplay(
    rows: Array<Record<string, unknown>>,
    ctx: {
      userIdToName: Record<string, string>;
      emailToName: Record<string, string>;
      projectDisplayByCode: Record<string, string>;
    }
  ) {
    const { userIdToName, emailToName, projectDisplayByCode } = ctx;
    return rows.map((row) => {
      const uidRaw = row.user_id ?? row.userId ?? row.userID;
      const uid = uidRaw != null && uidRaw !== "" ? String(uidRaw).trim() : "";
      const email = allocationRowEmail(row);

      const fromRow = String(
        row.employee_name ??
          row.employeeName ??
          row.user_name ??
          row.userName ??
          ""
      ).trim();

      let employee_name =
        (uid && userIdToName[uid]) || (email && emailToName[email]) || fromRow;
      if (!employee_name && email) employee_name = email;
      if (!employee_name && uid) employee_name = `Employee #${uid}`;
      if (!employee_name) employee_name = "Employee (unresolved)";

      const code = allocationProjectCode(row);
      const titleOnRow = allocationProjectTitleFromRow(row);
      let allocated_project = "";
      if (code) {
        allocated_project =
          projectDisplayByCode[code] ?? (titleOnRow ? `${code} — ${titleOnRow}` : code);
      } else if (titleOnRow) {
        allocated_project = titleOnRow;
      } else {
        allocated_project = "Project (no code on record)";
      }

      return { ...row, employee_name, allocated_project };
    });
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
      { id: "employee-request", label: "Employee Request", roles: ["ROLE_HR", "ROLE_ADMIN"] },
      { id: "timelog", label: "Timelog Approvals", roles: ["ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "leave", label: "Leave Requests", roles: ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR", "ROLE_ADMIN"] },
      { id: "uploads", label: "Uploads & Notifications", roles: ["ROLE_HR", "ROLE_ADMIN"] },
      { id: "masters", label: "Masters & Admin", roles: ["ROLE_HR", "ROLE_ADMIN"] },
    ],
    []
  );
  const availableOnboardRoles = bandDeptRoleMap[onboardForm.department] ?? [];
  const loadAllProjectsForHr = useCallback(async () => {
    const res = await hrmsService.getProjects({ page: "0", size: "10" });
    const rows = toRows(res.data);
    if (rows.length) return rows;
    const fallback = await hrmsService.getAllProjects({});
    return toRows(fallback.data ?? fallback);
  }, []);
  async function loadMyLeaveRequests() {
    const email = String(
      (user as { email?: string; user_email?: string } | null)?.email ??
        (user as { email?: string; user_email?: string } | null)?.user_email ??
        ""
    ).trim();
    if (!email) {
      setMyLeaveRequests([]);
      return;
    }
    const today = new Date();
    const from = `${today.getFullYear()}-01-01`;
    const to = today.toISOString().slice(0, 10);
    const types = ["LEAVE", "WFH", "COMP_OFF"] as const;
    const responses = await Promise.all(
      types.map((type) =>
        apiClient.get(endpoints.userRequest.getByEmployees(email, from, to, type), {
          query: { page: "0", size: "200" },
        })
      )
    );
    const merged = responses.flatMap((res) => toPagedRows((res as { data?: unknown }).data ?? res));
    const deduped = Array.from(
      new Map(
        merged.map((row) => {
          const key = String(row.user_request_id ?? row.userRequestId ?? row.id ?? Math.random());
          return [key, row] as const;
        })
      ).values()
    );
    setMyLeaveRequests(deduped);
  }
  const loadEmployeeRequestsForHr = useCallback(async () => {
    const today = new Date();
    const from = employeeRequestFilters.fromDate || `${today.getFullYear()}-01-01`;
    const to = employeeRequestFilters.toDate || today.toISOString().slice(0, 10);
    const requestType = employeeRequestFilters.requestType || "LEAVE";
    const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "10" });
    const onboardRows = toPagedRows(onboardRes.data ?? onboardRes);
    const idToName = buildUserIdToNameMap(onboardRows);
    const emailToName = buildEmailToNameMap(onboardRows);
    const userIdToEmail: Record<string, string> = {};
    for (const row of onboardRows) {
      const uid = String(row.user_id ?? row.userId ?? row.userID ?? row.id ?? row.emp_id ?? "").trim();
      const email = String(row.email ?? row.user_email ?? row.userEmail ?? "").trim().toLowerCase();
      if (uid && email) userIdToEmail[uid] = email;
    }
    const emailCsv = onboardRows
      .map((r) => String(r.email ?? "").trim())
      .filter(Boolean)
      .join(",");
    let rows: Array<Record<string, unknown>> = [];
    if (emailCsv) {
      try {
        const withEmployees = await apiClient.get(
          endpoints.userRequest.getByEmployees(emailCsv, from, to, requestType),
          { query: { page: "0", size: "200" } }
        );
        rows = toPagedRows((withEmployees as { data?: unknown }).data ?? withEmployees);
      } catch {
        rows = [];
      }
    }
    if (!rows.length) {
      const res = await apiClient.get(endpoints.userRequest.getRange(from, to, requestType), {
        query: { page: "0", size: "200" },
      });
      rows = toPagedRows((res as { data?: unknown }).data ?? res);
    }
    const unresolvedEmails = [
      ...new Set(
        rows
          .map((row) =>
            String(
              row.emp_email ??
                row.empEmail ??
                row.email ??
                row.user_email ??
                row.userEmail ??
                row.employee_email ??
                row.employeeEmail ??
                ""
            )
              .trim()
              .toLowerCase()
          )
          .filter((email) => Boolean(email) && !emailToName[email])
      ),
    ];
    await Promise.all(
      unresolvedEmails.map(async (email) => {
        try {
          const userRes = await hrmsService.getUser({ email });
          const payload = ((userRes as { data?: unknown }).data ?? userRes) as
            | Record<string, unknown>
            | null;
          if (!payload || typeof payload !== "object") return;
          const nested =
            (payload.user as Record<string, unknown> | undefined)?.name ??
            (payload.profile as Record<string, unknown> | undefined)?.name;
          const name = String(payload.name ?? nested ?? "").trim();
          if (name) emailToName[email] = name;
        } catch {
          /* ignore lookup misses */
        }
      })
    );
    const enriched = rows.map((row) => {
      const email = String(
        row.email ??
          row.user_email ??
          row.userEmail ??
          row.emp_email ??
          row.empEmail ??
          row.employee_email ??
          row.employeeEmail ??
          row.requested_by ??
          row.requestedBy ??
          ""
      )
        .trim()
        .toLowerCase();
      const uid = String(row.user_id ?? row.userId ?? row.emp_id ?? row.empId ?? "").trim();
      const nameFromRow = String(
        row.name ??
          row.employee_name ??
          row.employeeName ??
          row.user_name ??
          row.userName ??
          row.emp_name ??
          row.empName ??
          row.requested_by_name ??
          row.requestedByName ??
          ""
      ).trim();
      const emailFromUid = uid ? userIdToEmail[uid] ?? "" : "";
      const employee_display =
        nameFromRow ||
        (email && emailToName[email]) ||
        (emailFromUid && emailToName[emailFromUid]) ||
        (uid && idToName[uid]) ||
        email ||
        emailFromUid ||
        (uid ? `User #${uid}` : "—");
      return { ...row, employee_display };
    });
    setEmployeeRequests(enriched);
  }, [employeeRequestFilters]);

  async function updateEmployeeRequestStatus(requestId: string, status: "APPROVED" | "REJECTED") {
    const idNum = Number(requestId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new Error("Invalid request id.");
    }
    const message = status === "REJECTED" ? "Rejected by HR" : null;
    try {
      await apiClient.put(endpoints.userRequest.status, {
        contentType: "application/json",
        body: JSON.stringify({
          user_request_id: idNum,
          user_request_status: status,
          message,
        }),
      });
    } catch {
      await apiClient.put(endpoints.userRequest.status, {
        contentType: "application/json",
        body: JSON.stringify({
          user_request_id: idNum,
          user_request_status: status === "APPROVED" ? "APPROVE" : "REJECT",
          message,
        }),
      });
    }
  }
  const loadAllocationsForHr = useCallback(async () => {
    const res = await hrmsService.getAllocations({ page: "0", size: "200", view: "ALL" });
    const primary = (res as { data?: unknown }).data ?? res;
    let rows = toPagedRows(primary);
    if (!rows.length) {
      const fallback = await hrmsService.getAllocations({ page: "0", size: "200" });
      const fbPayload = (fallback as { data?: unknown }).data ?? fallback;
      rows = toPagedRows(fbPayload);
    }

    let onboardUsers: Array<Record<string, unknown>> = [];
    let projectRows: Array<Record<string, unknown>> = [];
    await Promise.all([
      (async () => {
        try {
          const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "10" });
          const onboardPayload = (onboardRes as { data?: unknown }).data ?? onboardRes;
          onboardUsers = toRows(onboardPayload);
        } catch {
          onboardUsers = [];
        }
      })(),
      (async () => {
        try {
          projectRows = await loadAllProjectsForHr();
        } catch {
          projectRows = [];
        }
      })(),
    ]);

    const userIdToName = buildUserIdToNameMap(onboardUsers);
    const emailToName = buildEmailToNameMap(onboardUsers);
    const projectDisplayByCode = buildProjectCodeDisplayMap(projectRows);

    const emailsToResolve = [
      ...new Set(
        rows.flatMap((r) => {
          const em = allocationRowEmail(r);
          if (!em) return [];
          const uid = String(r.user_id ?? r.userId ?? r.userID ?? "").trim();
          if (uid && userIdToName[uid]) return [];
          if (emailToName[em]) return [];
          return [em];
        })
      ),
    ];

    await Promise.all(
      emailsToResolve.map(async (email) => {
        try {
          const userRes = await hrmsService.getUser({ email });
          const raw = (userRes as { data?: unknown })?.data;
          const payload =
            raw && typeof raw === "object"
              ? (raw as Record<string, unknown>)
              : userRes && typeof userRes === "object"
                ? (userRes as unknown as Record<string, unknown>)
                : null;
          const nested =
            (payload?.user as Record<string, unknown> | undefined)?.name ??
            (payload?.profile as Record<string, unknown> | undefined)?.name;
          const name = String(payload?.name ?? nested ?? "").trim();
          if (name) emailToName[email] = name;
        } catch {
          /* ignore */
        }
      })
    );

    setAllocations(
      enrichAllocationRowsForDisplay(rows, {
        userIdToName,
        emailToName,
        projectDisplayByCode,
      })
    );
  }, [loadAllProjectsForHr]);
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
  const visibleNavigation = navigation.filter((item) => {
    if (item.id === "employee" && !hasHrAccess) return false;
    return item.roles.length === 0 ? true : item.roles.some((r) => userRoles.includes(r));
  });

  const goToTab = (id: string) => {
    setActiveTab(id);
    router.replace("/dashboard", { scroll: false });
  };

  const renderSelfOnboardingPanel = () => (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
      <h3 className="font-semibold mb-1">Complete Your Onboarding</h3>
      <p className="text-sm text-wt-text-muted mb-4">Employees must complete onboarding before full portal access.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <InputField label="Years of Experience" value={selfOnboardForm.yoe} onChange={(v) => setSelfOnboardForm((p) => ({ ...p, yoe: v }))} />
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
      {priorEmploymentDocsRequired ? (
        <div className="mt-4 rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-sm font-medium text-wt-text mb-2">Prior employment (YoE &gt; 0)</p>
          <p className="text-xs text-wt-text-muted mb-3">
            Relieving letter and three recent payslips are required when years of experience is greater than zero.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FileField
              label="Relieving letter (previous company)"
              accept=".pdf,image/*"
              onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, reliving_letter: file }))}
            />
            <FileField
              multiple
              label="Upload last 3 months payslip"
              accept=".pdf,image/*"
              onPickFiles={(files) => setSelfOnboardFiles((p) => ({ ...p, salary_slips: files }))}
            />
          </div>
          <p className="mt-2 text-xs text-wt-text-muted">
            Select exactly three files in one go (one file per month).
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-wt-text-muted">
          If your years of experience is above zero, add relieving letter and the last three months&apos; payslips (fields appear when YoE &gt; 0).
        </p>
      )}
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
              if (priorEmploymentDocsRequired) {
                if (!selfOnboardFiles.reliving_letter) {
                  throw new Error(
                    "Please upload your relieving letter from the previous company."
                  );
                }
                if (selfOnboardFiles.salary_slips.length !== 3) {
                  throw new Error(
                    "Please select exactly three payslip files (last three months) in the payslip field."
                  );
                }
              }
              if (
                selfOnboardFiles.profile_photo.type &&
                !selfOnboardFiles.profile_photo.type.startsWith("image/")
              ) {
                throw new Error("Profile photo must be an image file (jpg/png/webp).");
              }
              const selectedFiles: Array<[string, File]> = [];
              for (const [key, val] of Object.entries(selfOnboardFiles)) {
                if (key === "salary_slips") {
                  (val as File[]).forEach((file, i) =>
                    selectedFiles.push([`payslip ${i + 1}`, file])
                  );
                  continue;
                }
                if (val) selectedFiles.push([key, val as File]);
              }
              for (const [key, file] of selectedFiles) {
                if (file.size > MAX_ONBOARD_FILE_BYTES) {
                  throw new Error(
                    `${key.replaceAll("_", " ")} exceeds 2 MB. Please upload a smaller file.`
                  );
                }
              }
              const totalBytes = selectedFiles.reduce((sum, [, file]) => sum + file.size, 0);
              if (totalBytes > MAX_ONBOARD_TOTAL_BYTES) {
                throw new Error("Total upload size exceeds 6 MB. Compress files and retry.");
              }
              fd.append(
                "user_data",
                JSON.stringify({
                  email: user.email,
                  yoe: selfOnboardForm.yoe ? Number(selfOnboardForm.yoe) : null,
                  experience: null,
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
                if (key === "salary_slips") {
                  (file as File[]).forEach((f) => fd.append("salary_slips[]", f));
                  return;
                }
                if (!file) return;
                fd.append(key, file as File);
              });
              await hrmsService.completeMyOnboarding(fd);
              setSelfOnboardForm({
                yoe: "",
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
                reliving_letter: null,
                salary_slips: [],
              });
              setIsSelfOnboarded(true);
              await refreshSession();
              await loadMyProfile();
              router.replace("/dashboard", { scroll: false });
              setActiveTab("overview");
            })
          }
          disabled={actionLoading}
        >
          Submit Onboarding Form
        </button>
      </div>
    </div>
  );

  const renderEditMyProfilePanel = () => (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
      <h3 className="font-semibold mb-1">Edit My Profile</h3>
      <p className="text-sm text-wt-text-muted mb-4">You are onboarded. Update your profile details anytime.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <InputField label="Phone Number" value={selfProfileForm.phone_number} onChange={(v) => setSelfProfileForm((p) => ({ ...p, phone_number: v }))} />
        <InputField label="Primary Skills (comma separated)" value={selfProfileForm.primary_skills} onChange={(v) => setSelfProfileForm((p) => ({ ...p, primary_skills: v }))} />
        <InputField label="Secondary Skill" value={selfProfileForm.secondary_skill} onChange={(v) => setSelfProfileForm((p) => ({ ...p, secondary_skill: v }))} />
        <SelectField label="Secondary Skill Rating" value={selfProfileForm.secondary_rating} options={["1", "2", "3", "4", "5"]} onChange={(v) => setSelfProfileForm((p) => ({ ...p, secondary_rating: v }))} />
        <InputField label="Years of Experience" value={selfProfileForm.yoe} onChange={(v) => setSelfProfileForm((p) => ({ ...p, yoe: v }))} />
      </div>
      {priorEmploymentDocsForProfile ? (
        <div className="mt-4 rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-sm font-medium text-wt-text mb-2">Prior employment (YoE &gt; 0)</p>
          <p className="text-xs text-wt-text-muted mb-3">
            Relieving letter and three recent payslips are required when years of experience is greater than zero.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FileField
              label="Relieving letter (previous company)"
              accept=".pdf,image/*"
              onPick={(file) => setSelfProfileEmploymentFiles((p) => ({ ...p, reliving_letter: file }))}
            />
            <FileField
              multiple
              label="Upload last 3 months payslip"
              accept=".pdf,image/*"
              onPickFiles={(files) =>
                setSelfProfileEmploymentFiles((p) => ({ ...p, salary_slips: files }))
              }
            />
          </div>
          <p className="mt-2 text-xs text-wt-text-muted">
            Select exactly three files in one go (one file per month).
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-wt-text-muted">
          If your years of experience is above zero, add relieving letter and the last three months&apos; payslips (fields appear when YoE &gt; 0).
        </p>
      )}
      <div className="mt-3">
        <FileField label="Profile Picture (optional)" accept="image/*" onPick={setSelfProfilePic} />
      </div>
      <div className="mt-4">
        <button
          type="button"
          className="btn-primary px-3 py-2"
          onClick={() =>
            runAction("Update my profile", async () => {
              const primarySkills = selfProfileForm.primary_skills
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              if (priorEmploymentDocsForProfile) {
                if (!selfProfileEmploymentFiles.reliving_letter) {
                  throw new Error(
                    "Please upload your relieving letter from the previous company."
                  );
                }
                if (selfProfileEmploymentFiles.salary_slips.length !== 3) {
                  throw new Error(
                    "Please select exactly three payslip files (last three months) in the payslip field."
                  );
                }
              }
              const employmentFilesFlat: Array<[string, File]> = [];
              if (selfProfileEmploymentFiles.reliving_letter) {
                employmentFilesFlat.push([
                  "reliving letter",
                  selfProfileEmploymentFiles.reliving_letter,
                ]);
              }
              selfProfileEmploymentFiles.salary_slips.forEach((f, i) =>
                employmentFilesFlat.push([`payslip ${i + 1}`, f])
              );
              const profilePicFiles: Array<[string, File]> = selfProfilePic
                ? [["profilePic", selfProfilePic]]
                : [];
              for (const [, file] of [...employmentFilesFlat, ...profilePicFiles]) {
                if (file.size > MAX_ONBOARD_FILE_BYTES) {
                  throw new Error("A selected file exceeds 2 MB. Please upload a smaller file.");
                }
              }
              const totalBytes =
                employmentFilesFlat.reduce((sum, [, f]) => sum + f.size, 0) +
                (selfProfilePic?.size ?? 0);
              if (totalBytes > MAX_ONBOARD_TOTAL_BYTES) {
                throw new Error(
                  "Total upload size exceeds 6 MB. Compress files and retry."
                );
              }
              if (
                selfProfilePic &&
                selfProfilePic.type &&
                !selfProfilePic.type.startsWith("image/")
              ) {
                throw new Error("Profile picture must be an image file (jpg/png/webp).");
              }
              const fd = new FormData();
              fd.append(
                "body",
                JSON.stringify({
                  phone_number: selfProfileForm.phone_number || null,
                  primary_skills: primarySkills.length ? primarySkills : null,
                  secondary_skills: selfProfileForm.secondary_skill
                    ? [
                        {
                          skill: selfProfileForm.secondary_skill.trim(),
                          rating: Number(selfProfileForm.secondary_rating),
                        },
                      ]
                    : [],
                  experience: null,
                  yoe: selfProfileForm.yoe ? Number(selfProfileForm.yoe) : null,
                })
              );
              if (selfProfilePic) {
                fd.append("profilePic", selfProfilePic);
              }
              if (selfProfileEmploymentFiles.reliving_letter) {
                fd.append("reliving_letter", selfProfileEmploymentFiles.reliving_letter);
              }
              selfProfileEmploymentFiles.salary_slips.forEach((f) =>
                fd.append("salary_slips[]", f)
              );
              await hrmsService.updateMyProfile(fd);
              setSelfProfileForm({
                phone_number: "",
                primary_skills: "",
                secondary_skill: "",
                secondary_rating: "3",
                yoe: "",
              });
              setSelfProfileEmploymentFiles({
                reliving_letter: null,
                salary_slips: [],
              });
              setSelfProfilePic(null);
            })
          }
          disabled={actionLoading}
        >
          Save Profile Changes
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-wt-bg text-wt-text lg:flex-row">
        <aside className="wt-scroll flex max-h-[min(38vh,280px)] shrink-0 flex-col border-b border-wt-border bg-wt-surface-1 p-4 lg:max-h-none lg:min-h-0 lg:w-[250px] lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-4 shrink-0">
            <WebTrakBrand variant="sidebar" />
          </div>
          <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {visibleNavigation.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goToTab(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeTab === item.id
                    ? "bg-wt-surface-3 text-wt-text"
                    : "text-wt-text-muted hover:bg-wt-surface-2"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {employeeSelfServeProfile ? (
            <div className="mt-4 shrink-0 border-t border-wt-border pt-4">
              <Link
                href="/dashboard?tab=profile"
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  activeTab === "profile"
                    ? "border-wt-border bg-wt-surface-3 text-wt-text"
                    : "border-transparent bg-wt-surface-2 text-wt-text-muted hover:bg-wt-surface-3 hover:text-wt-text"
                }`}
                aria-label="Profile"
                title="Profile"
              >
                <IconUser className="shrink-0" />
                Profile
              </Link>
            </div>
          ) : null}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-wt-border px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {activeTab === "profile" ? "My profile" : "Dashboard"}
              </h2>
              <p className="text-xs text-wt-text-muted">WebTrak workforce workspace</p>
            </div>
            <details className="group relative shrink-0">
              <summary
                className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-wt-border bg-wt-surface-1 p-2.5 text-wt-text shadow-sm transition hover:bg-wt-surface-2 [&::-webkit-details-marker]:hidden"
                aria-label="Settings"
              >
                <IconSettings className="h-5 w-5 text-wt-text-muted" />
                <span className="sr-only">Settings</span>
              </summary>
              <div
                className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,280px)] space-y-4 rounded-xl border border-wt-border bg-wt-surface-1 p-4 shadow-lg"
                role="menu"
              >
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-wt-text-muted">Theme</span>
                  <select
                    value={theme}
                    onChange={(event) => {
                      const nextTheme = event.target.value as "light" | "dark" | "system";
                      setTheme(nextTheme);
                      applyTheme(nextTheme);
                    }}
                    className="input-field w-full px-3 py-2 text-sm"
                    aria-label="Color theme"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="w-full rounded-lg border border-red-600/90 bg-red-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 active:bg-red-800"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </div>
            </details>
          </header>

          <main className="min-h-0 flex-1 space-y-4 p-4 sm:p-6">
            {requiresSelfOnboarding ? (
              <section className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 p-4">
                <h3 className="font-semibold">Onboarding pending</h3>
                <p className="text-sm mt-1">
                  Open <strong>Profile</strong> at the bottom of the sidebar to complete onboarding and unlock full access.
                </p>
              </section>
            ) : null}
            {activeTab === "overview" && !requiresSelfOnboarding ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard label="Total Onboarded" value={metrics.totalOnboarded} loading={loading} />
                <MetricCard label="Unread Notifications" value={metrics.unreadNotifications} loading={loading} />
                <MetricCard label="Timelog Records" value={metrics.timelogItems} loading={loading} />
                <MetricCard label="Leave Records" value={metrics.leaveRecords} loading={loading} />
              </div>
            ) : null}

            {activeTab === "profile" && employeeSelfServeProfile ? (
              <section className="max-w-3xl">
                {requiresSelfOnboarding ? renderSelfOnboardingPanel() : renderEditMyProfilePanel()}
              </section>
            ) : null}

            {activeTab === "employee" && hasHrAccess ? (
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
            ) : null}

            {activeTab === "allocation" && !requiresSelfOnboarding ? (
              <>
                {hasHrAccess ? (
                  <section className="grid xl:grid-cols-2 gap-4">
                    <div ref={projectCrudFormRef} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
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
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction(
                              editingProjectCode ? "Update project" : "Create project",
                              async () => {
                                await hrmsService.createProject({
                                  project_code: projectForm.project_code.trim(),
                                  project_name: projectForm.project_name.trim(),
                                  project_type: projectForm.project_type,
                                });
                                setEditingProjectCode("");
                                const rows = await loadAllProjectsForHr();
                                setProjects(rows);
                              }
                            )
                          }
                          disabled={actionLoading}
                        >
                          {editingProjectCode ? "Save Project" : "Create Project"}
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
                      {hasAdminAccess ? (
                          <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-4 space-y-3">
                            <p className="text-sm font-medium">Bulk create projects</p>
                            <p className="text-xs text-wt-text-muted">
                              <code className="text-[11px]">POST /api/v1/projects</code> — JSON array of{" "}
                              <code className="text-[11px]">CreateProjectRequest</code> (Admin only per API).
                            </p>
                            <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                              JSON body
                              <textarea
                                className="input-field min-h-[140px] px-3 py-2 text-xs font-mono"
                                value={projectBulkJson}
                                onChange={(e) => setProjectBulkJson(e.target.value)}
                                spellCheck={false}
                              />
                            </label>
                            <button
                              type="button"
                              className="btn-primary px-3 py-2 text-sm"
                              onClick={() =>
                                runAction("Bulk create projects", async () => {
                                  const parsed = JSON.parse(projectBulkJson) as unknown;
                                  if (!Array.isArray(parsed) || !parsed.length) {
                                    throw new Error("Body must be a non-empty JSON array.");
                                  }
                                  for (const item of parsed) {
                                    if (!item || typeof item !== "object") {
                                      throw new Error("Each array item must be an object.");
                                    }
                                    const o = item as Record<string, unknown>;
                                    const code = String(o.project_code ?? o.projectCode ?? "").trim();
                                    const name = String(o.project_name ?? o.projectName ?? "").trim();
                                    const typ = String(o.project_type ?? o.projectType ?? "").trim();
                                    if (!code || !name || !typ) {
                                      throw new Error("Each project needs project_code, project_name, project_type.");
                                    }
                                  }
                                  await hrmsService.createProjectsBulk(parsed as Array<Record<string, unknown>>);
                                  const rows = await loadAllProjectsForHr();
                                  setProjects(rows);
                                })
                              }
                              disabled={actionLoading}
                            >
                              Submit bulk create
                            </button>
                          </div>
                        ) : null}
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
                        {filteredProjects.length ? (
                          <div className="wt-scroll-both max-h-[min(50vh,420px)] overflow-auto rounded-lg border border-wt-border">
                            <table className="min-w-full text-sm">
                              <thead className="bg-wt-surface-1 text-wt-text-muted">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium">Project code</th>
                                  <th className="px-3 py-2 text-left font-medium">Project name</th>
                                  <th className="px-3 py-2 text-left font-medium">Type</th>
                                  <th className="px-3 py-2 text-right font-medium w-20">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredProjects.map((row, idx) => {
                                  const code = String(row.project_code ?? row.projectCode ?? "").trim();
                                  const name = String(row.project_name ?? row.projectName ?? "");
                                  const typ = String(row.project_type ?? row.projectType ?? "—");
                                  return (
                                    <tr key={code || String(idx)} className="border-t border-wt-border">
                                      <td className="px-3 py-2 whitespace-nowrap font-medium">{code || "—"}</td>
                                      <td className="px-3 py-2 max-w-[200px] truncate">{name || "—"}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{typ}</td>
                                      <td className="px-3 py-2 text-right">
                                        <button
                                          type="button"
                                          className="rounded-lg p-2 text-wt-text-muted hover:bg-rose-500/10 hover:text-rose-600"
                                          aria-label={`Delete project ${code}`}
                                          title="Delete project"
                                          disabled={actionLoading || !code}
                                          onClick={() =>
                                            runAction("Delete project", async () => {
                                              throw new Error(
                                                "Project delete API is not available on backend yet."
                                              );
                                            })
                                          }
                                        >
                                          <IconTrash />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-wt-text-muted">No projects match current filters.</p>
                        )}
                      </div>
                    </div>
                    <div ref={allocationFormRef} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                      <h3 className="font-semibold">Employee Allocation Form</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Employee Name
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={allocationForm.employee_email}
                            onChange={(e) =>
                              setAllocationForm((p) => ({
                                ...p,
                                employee_email: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select employee</option>
                            {allocationUsers.map((u) => (
                              <option key={u.email} value={u.email}>
                                {u.name} ({u.email})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                          Project Name
                          <select
                            className="input-field px-3 py-2 text-sm"
                            value={allocationForm.project_code}
                            onChange={(e) =>
                              setAllocationForm((p) => ({
                                ...p,
                                project_code: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select project</option>
                            {allocationProjects.map((p) => (
                              <option key={p.code} value={p.code}>
                                {p.name} ({p.code})
                              </option>
                            ))}
                          </select>
                        </label>
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
                        If clicked, employee becomes manager
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction(editingAllocationId ? "Update allocation" : "Create allocation", async () => {
                              const payload = {
                                employee_email: allocationForm.employee_email.trim(),
                                project_code: allocationForm.project_code.trim(),
                                role: allocationForm.role.trim() || null,
                                allocated_hours: Number(allocationForm.allocated_hours),
                                start_date: allocationForm.start_date,
                                end_date: allocationForm.end_date || null,
                                allocation_type: allocationForm.allocation_type,
                                is_manager: Boolean(allocationForm.is_manager),
                                isManager: Boolean(allocationForm.is_manager),
                              };
                              if (editingAllocationId) {
                                await hrmsService.updateAllocation(editingAllocationId, payload);
                              } else {
                                await hrmsService.createAllocation(payload);
                              }
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
                              setEditingAllocationId("");
                              await loadAllocationsForHr();
                            })
                          }
                          disabled={actionLoading}
                        >
                          {editingAllocationId ? "Save Allocation" : "Allocate Employee"}
                        </button>
                        <button
                          type="button"
                          className="btn-primary px-3 py-2"
                          onClick={() =>
                            runAction("Load allocations", async () => {
                              await loadAllocationsForHr();
                              requestAnimationFrame(() => {
                                allocationRecordsRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                              });
                            })
                          }
                          disabled={actionLoading}
                        >
                          Refresh Allocations
                        </button>
                      </div>
                      <div
                        ref={allocationRecordsRef}
                        className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Allocation Records</p>
                          <span className="text-xs text-wt-text-muted">{allocations.length} row(s)</span>
                        </div>
                        {allocations.length ? (
                          <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
                            <table className="min-w-full text-sm">
                              <thead className="bg-wt-surface-2 text-wt-text-muted">
                                <tr>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">ALLOCATED PROJECT</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">EMPLOYEE NAME</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">ROLE</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">ALLOCATED HOURS</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">ALLOCATION TYPE</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">START DATE</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">END DATE</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">IS ACTIVE</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">WORK LOCATION TYPE</th>
                                  <th className="text-right px-3 py-2 font-medium whitespace-nowrap">ACTIONS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allocations.map((row, idx) => {
                                  const allocationId = String(
                                    row.id ?? row.allocation_id ?? row.allocationId ?? ""
                                  ).trim();
                                  const allocatedProjectText = String(row.allocated_project ?? "").trim();
                                  const derivedProjectCode = allocatedProjectText.includes("—")
                                    ? (allocatedProjectText.split("—")[0] ?? "").trim()
                                    : allocatedProjectText;
                                  const projectCode = String(
                                    row.project_code ??
                                      row.projectCode ??
                                      row.project_id ??
                                      row.projectId ??
                                      derivedProjectCode
                                  ).trim();
                                  const employeeEmail = String(
                                    row.employee_email ?? row.employeeEmail ?? row.email ?? ""
                                  ).trim();
                                  const role = String(row.role ?? "").trim();
                                  const allocatedHours = String(
                                    row.allocated_hours ?? row.allocatedHours ?? ""
                                  ).trim();
                                  const startDate = String(row.start_date ?? row.startDate ?? "").trim();
                                  const endDate = String(row.end_date ?? row.endDate ?? "").trim();
                                  const allocationType = String(
                                    row.allocation_type ?? row.allocationType ?? "DEPLOYABLE"
                                  ).trim();
                                  const activeRaw = row.is_active ?? row.isActive;
                                  const isManagerRaw = row.is_manager ?? row.isManager;
                                  return (
                                    <tr key={`${allocationId || "alloc"}-${idx}`} className="border-t border-wt-border">
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.allocated_project ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.employee_name ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.role ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.allocated_hours ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.allocation_type ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.start_date ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.end_date ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.is_active ?? "—")}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{String(row.work_location_type ?? "—")}</td>
                                      <td className="px-3 py-2 text-right">
                                        <div className="inline-flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            className="rounded-lg p-2 text-wt-text-muted hover:bg-wt-surface-1 hover:text-wt-text"
                                            aria-label={`Edit allocation ${allocationId || idx}`}
                                            title="Edit allocation"
                                            disabled={actionLoading}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setAllocationForm((prev) => ({
                                                ...prev,
                                                allocation_id: allocationId,
                                                employee_email: employeeEmail,
                                                project_code: projectCode,
                                                role,
                                                allocated_hours: allocatedHours || "8",
                                                start_date: startDate,
                                                end_date: endDate,
                                                allocation_type:
                                                  ["DEPLOYABLE", "STAFFING", "NONDEPLOYABLE", "NONBILLABLE", "LOCKED"].includes(
                                                    allocationType.toUpperCase()
                                                  )
                                                    ? allocationType.toUpperCase()
                                                    : "DEPLOYABLE",
                                                is_manager: Boolean(isManagerRaw),
                                              }));
                                              setEditingAllocationId(allocationId);
                                              requestAnimationFrame(() => {
                                                allocationFormRef.current?.scrollIntoView({
                                                  behavior: "smooth",
                                                  block: "start",
                                                });
                                              });
                                            }}
                                          >
                                            <IconPencil />
                                          </button>
                                          <button
                                            type="button"
                                            className="rounded-lg p-2 text-wt-text-muted hover:bg-rose-500/10 hover:text-rose-600"
                                            aria-label={`Delete allocation ${allocationId || idx}`}
                                            title="Delete allocation"
                                            disabled={actionLoading || !allocationId}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              runAction("Delete allocation", async () => {
                                                await hrmsService.deleteAllocation(allocationId);
                                                await loadAllocationsForHr();
                                              });
                                            }}
                                          >
                                            <IconTrash />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-wt-text-muted">No allocations loaded.</p>
                        )}
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
              <div className="space-y-4">
                {hasManagerAccess ? (
                  <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-semibold">Manager portfolio</h3>
                        <p className="text-xs text-wt-text-muted mt-1">
                          View your team allocations and project context for approvals.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2 text-sm"
                        onClick={() =>
                          runAction("Refresh manager projects", async () => {
                            const res = await hrmsService.getManagerProjectsWithRoles();
                            setManagerPortfolioRows(toPagedRows(res.data ?? res));
                          })
                        }
                        disabled={actionLoading}
                      >
                        Refresh manager view
                      </button>
                    </div>
                    {managerPortfolioRows[0] ? (
                      <DataTable
                        columns={Object.keys(managerPortfolioRows[0]).slice(0, 14)}
                        rows={managerPortfolioRows}
                        emptyLabel="No manager project rows."
                      />
                    ) : (
                      <p className="text-sm text-wt-text-muted">
                        No manager data yet. Click <strong>Refresh manager view</strong> to load your portfolio.
                      </p>
                    )}
                  </section>
                ) : null}
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
              </div>
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
                <div className="space-y-4">
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
                          runAction(editingLeaveRequestId ? "Update leave request" : "Create leave request", async () => {
                            const payload = {
                              ...leaveRequestForm,
                              is_half_day: leaveRequestForm.is_half_day,
                            };
                            if (editingLeaveRequestId) {
                              await apiClient.put(endpoints.userRequest.root, {
                                contentType: "application/json",
                                body: JSON.stringify({
                                  ...payload,
                                  user_request_id: Number(editingLeaveRequestId),
                                }),
                              });
                            } else {
                              await apiClient.post(endpoints.userRequest.root, {
                                contentType: "application/json",
                                body: JSON.stringify(payload),
                              });
                            }
                            setLeaveRequestForm({
                              request_from_date: "",
                              request_to_date: "",
                              request_type: "LEAVE",
                              comments: "",
                              is_half_day: false,
                            });
                            setEditingLeaveRequestId("");
                            await loadMyLeaveRequests();
                          })
                        }
                        disabled={actionLoading}
                      >
                        {editingLeaveRequestId ? "Save Changes" : "Submit Request"}
                      </button>
                      {editingLeaveRequestId ? (
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2"
                          onClick={() => {
                            setLeaveRequestForm({
                              request_from_date: "",
                              request_to_date: "",
                              request_type: "LEAVE",
                              comments: "",
                              is_half_day: false,
                            });
                            setEditingLeaveRequestId("");
                          }}
                          disabled={actionLoading}
                        >
                          Cancel Edit
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">My Previous Requests</h3>
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        onClick={() => runAction("Load my leave requests", loadMyLeaveRequests)}
                        disabled={actionLoading}
                      >
                        Refresh
                      </button>
                    </div>
                    {myLeaveRequests.length ? (
                      <div className="wt-scroll-both max-h-[min(50vh,380px)] rounded-xl border border-wt-border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-wt-surface-2 text-wt-text-muted">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Request Type</th>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">From</th>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">To</th>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Status</th>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Comments</th>
                              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myLeaveRequests.map((row, idx) => {
                              const requestId = String(
                                row.user_request_id ??
                                  row.userRequestId ??
                                  row.request_id ??
                                  row.requestId ??
                                  row.id ??
                                  ""
                              ).trim();
                              const status = String(
                                row.user_request_status ?? row.userRequestStatus ?? row.status ?? "PENDING"
                              ).toUpperCase();
                              const isPending = status === "PENDING";
                              return (
                                <tr key={`${requestId || "myreq"}-${idx}`} className="border-t border-wt-border">
                                  <td className="px-3 py-2 whitespace-nowrap">{String(row.request_type ?? row.requestType ?? "—")}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{String(row.request_from_date ?? row.requestFromDate ?? "—")}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{String(row.request_to_date ?? row.requestToDate ?? "—")}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{status}</td>
                                  <td className="px-3 py-2 max-w-[240px] truncate">{String(row.comments ?? "—")}</td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="inline-flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        className="rounded-lg px-2.5 py-1.5 text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                        disabled={actionLoading || !requestId || !isPending}
                                        onClick={() => {
                                          setLeaveRequestForm({
                                            request_from_date: String(row.request_from_date ?? row.requestFromDate ?? ""),
                                            request_to_date: String(row.request_to_date ?? row.requestToDate ?? ""),
                                            request_type: String(row.request_type ?? row.requestType ?? "LEAVE"),
                                            comments: String(row.comments ?? ""),
                                            is_half_day: Boolean(row.is_half_day ?? row.isHalfDay ?? false),
                                          });
                                          setEditingLeaveRequestId(requestId);
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-lg px-2.5 py-1.5 text-xs border border-rose-600/30 text-rose-700 hover:bg-rose-500/10 disabled:opacity-50"
                                        disabled={actionLoading || !requestId || !isPending}
                                        onClick={() =>
                                          runAction("Revoke leave request", async () => {
                                            await apiClient.delete(endpoints.userRequest.root, {
                                              contentType: "application/json",
                                              body: JSON.stringify({
                                                user_request_id: Number(requestId),
                                              }),
                                            });
                                            if (editingLeaveRequestId === requestId) {
                                              setEditingLeaveRequestId("");
                                              setLeaveRequestForm({
                                                request_from_date: "",
                                                request_to_date: "",
                                                request_type: "LEAVE",
                                                comments: "",
                                                is_half_day: false,
                                              });
                                            }
                                            await loadMyLeaveRequests();
                                          })
                                        }
                                      >
                                        Revoke
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-wt-text-muted">No previous requests found.</p>
                    )}
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

            {activeTab === "employee-request" && !requiresSelfOnboarding ? (
              <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <InputField
                    label="From Date"
                    value={employeeRequestFilters.fromDate}
                    onChange={(v) => setEmployeeRequestFilters((p) => ({ ...p, fromDate: v }))}
                    type="date"
                  />
                  <InputField
                    label="To Date"
                    value={employeeRequestFilters.toDate}
                    onChange={(v) => setEmployeeRequestFilters((p) => ({ ...p, toDate: v }))}
                    type="date"
                  />
                  <SelectField
                    label="Request Type"
                    value={employeeRequestFilters.requestType}
                    options={["LEAVE", "WFH", "COMP_OFF"]}
                    onChange={(v) => setEmployeeRequestFilters((p) => ({ ...p, requestType: v }))}
                  />
                  <button
                    type="button"
                    className="btn-primary px-3 py-2 h-10"
                    onClick={() => runAction("Load employee requests", loadEmployeeRequestsForHr)}
                    disabled={actionLoading}
                  >
                    Refresh Requests
                  </button>
                </div>

                {employeeRequests.length ? (
                  <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-wt-surface-2 text-wt-text-muted">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Employee</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Type</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">From</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">To</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Status</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Comments</th>
                          <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeRequests.map((row, idx) => {
                          const requestId = String(
                            row.user_request_id ??
                              row.userRequestId ??
                              row.request_id ??
                              row.requestId ??
                              row.id ??
                              ""
                          ).trim();
                          const status = String(
                            row.user_request_status ?? row.userRequestStatus ?? row.status ?? "PENDING"
                          ).toUpperCase();
                          const employee = String(
                            row.employee_display ??
                              row.name ??
                              row.employee_name ??
                              row.employeeName ??
                              row.email ??
                              row.user_email ??
                              "—"
                          ).trim();
                          return (
                            <tr key={`${requestId || "req"}-${idx}`} className="border-t border-wt-border">
                              <td className="px-3 py-2 whitespace-nowrap">{employee || "—"}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{String(row.request_type ?? row.requestType ?? "—")}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{String(row.request_from_date ?? row.requestFromDate ?? "—")}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{String(row.request_to_date ?? row.requestToDate ?? "—")}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{status}</td>
                              <td className="px-3 py-2 max-w-[220px] truncate">{String(row.comments ?? "—")}</td>
                              <td className="px-3 py-2 text-right">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    className="rounded-lg px-2.5 py-1.5 text-xs border border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-50"
                                    disabled={actionLoading || !requestId || status !== "PENDING"}
                                    onClick={() =>
                                      runAction("Approve request", async () => {
                                        await updateEmployeeRequestStatus(requestId, "APPROVED");
                                        await loadEmployeeRequestsForHr();
                                      })
                                    }
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg px-2.5 py-1.5 text-xs border border-rose-600/30 text-rose-700 hover:bg-rose-500/10 disabled:opacity-50"
                                    disabled={actionLoading || !requestId || status !== "PENDING"}
                                    onClick={() =>
                                      runAction("Reject request", async () => {
                                        await updateEmployeeRequestStatus(requestId, "REJECTED");
                                        await loadEmployeeRequestsForHr();
                                      })
                                    }
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-wt-text-muted">
                    No employee requests loaded yet. Click <strong>Refresh Requests</strong>.
                  </p>
                )}
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

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-wt-bg text-sm text-wt-text-muted">
          Loading…
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
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
  onPickFiles,
  accept,
  multiple,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  onPick?: (file: File | null) => void;
  onPickFiles?: (files: File[]) => void;
}) {
  const isMulti = Boolean(multiple);
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <input
        type="file"
        accept={accept}
        multiple={isMulti}
        className="input-field px-3 py-2 text-sm"
        onChange={(e) => {
          if (isMulti) {
            onPickFiles?.(e.target.files?.length ? Array.from(e.target.files) : []);
          } else {
            onPick?.(e.target.files?.[0] ?? null);
          }
        }}
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
    <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
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
