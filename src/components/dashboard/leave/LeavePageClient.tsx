"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PageTabs, PAGE_TAB_BODY_CLASS } from "@/components/dashboard/ui/PageTabs";
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
import { Skeleton } from "@/components/ui/skeleton";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/api/httpClient";
import { endpoints } from "@/api/endpoints";
import { hrmsService } from "@/services/hrms.service";
import { useMyLeaveRequests, myLeaveRequestsQueryKey } from "@/hooks/leave/useMyLeaveRequests";
import { useMyLeaveAllocations } from "@/hooks/leave/useMyLeaveAllocations";
import { ApiError } from "@/api/error";
import { toRows, toPagedRows } from "@/utils/apiRows";
import {
  formatActionErrorMessage,
  formatActionSuccessMessage,
  userRequestActionLabel,
  formatUserRequestTypeLabel,
  normalizeUserRequestType,
  USER_REQUEST_FILTER_TYPE_OPTIONS,
  USER_REQUEST_TYPE_SELECT_OPTIONS,
} from "@/utils/actionToast";
import { AllocationExtensionPanel } from "@/components/dashboard/sections/AllocationExtensionPanel";
import { AccountManagerSelect } from "@/components/allocation/AccountManagerSelect";
import {
  normalizePickerEmail,
  requestRowEmail,
} from "@/utils/learning/onboardOptions";
import { useAccountManagerEmails } from "@/hooks/useAccountManagerEmails";
import { HrReviewNoticeBanner } from "@/components/hr-review/HrReviewNoticeBanner";
import { hasDmRole, isAccountManagerEmployeeUser } from "@/utils/roles";
import {
  HARDCODED_DEPARTMENT_OPTIONS,
  MAX_ONBOARD_FILE_BYTES,
  MAX_ONBOARD_TOTAL_BYTES,
} from "@/constants/dashboard";
import {
  defaultInvitedEmployeesDateRange,
  filterInvitedRowsByCreatedAtRange,
  formatInvitedEmployeeTableRows,
  allocationAccManagerCell,
} from "@/utils/dashboard/invitedEmployees";
import {
  isValidPersonName,
  isValidIndiaMobile,
  resolveInternBandId,
  generateAutomaticProjectCode,
  designationAllowsFlexibleHours,
  FLEXIBLE_ALLOCATION_HOUR_OPTIONS,
  RESTRICTED_ALLOCATION_HOUR_OPTIONS,
  formatAllocatedHoursPercentLabel,
} from "@/utils/dashboard/validation";
import { applyTheme } from "@/utils/dashboard/theme";
import {
  isManagerFlagTruthy,
  isManagerRoleLabel,
  buildProjectCodeDisplayMap,
  enrichAllocationRowsForDisplay,
  normalizeForecastRows,
  allocationRowEmail,
  allocationProjectCode,
  allocationProjectTitleFromRow,
} from "@/utils/dashboard/allocationDisplay";
import {
  normalizeAssignedProjects,
  mergeProjectAndAllocationData,
  managerProjectCode,
  managerProjectName,
  managerTeamEmails,
  managerTeamRowsForProject,
} from "@/utils/dashboard/projects";
import { MetricCard } from "@/components/dashboard/ui/MetricCard";
import { InputField, SelectField, TextAreaField, FileField, UploadTile, ApiDateField } from "@/components/dashboard/ui/forms";
import {
  ProfilePhotoAvatar,
  ProfileField,
  formatSecondarySkillsForProfile,
} from "@/components/dashboard/ui/profile";
import { DataTable } from "@/components/dashboard/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { filledBadgeClass } from "@/components/dashboard/ui/badgeTones";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  activeSortDirectionForColumn,
  applyListSort,
  LEAVE_REQUEST_SORT_OPTIONS,
  toggleColumnSort,
} from "@/utils/listSort";
import { IconUser, IconPencil, IconTrash, IconRefresh } from "@/components/dashboard/ui/icons";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import {
  compareApiDates,
  formatApiDate,
  normalizeToApiDate,
  parseApiDate,
  todayApiDate,
} from "@/utils/apiDate";
import {
  canHrShowTeamRequestActions,
  canManagerActOnRequest,
  canManagerRejectRequest,
  extractStatusUpdateData,
  formatApprovalStageLabel,
  formatStageRejectionReason,
  listScopedUserRequests,
  mergeStatusUpdateIntoRow,
  requestFinalStatus,
  requestHrStatus,
  requestManagerStatus,
  hrTeamActionBlockedHint,
  updateUserRequestStatus,
  type UserRequestStatusValue,
} from "@/utils/userRequest";
import { buildUserRequestBody } from "@/utils/leaveRequestPayload";
import { activeAllocationsRequireClientApproval } from "@/utils/leaveAllocations";
import { HrLeaveBalancesPanel } from "@/components/dashboard/leave/HrLeaveBalancesPanel";
import { HrWfhRequestsPanel } from "@/components/dashboard/leave/HrWfhRequestsPanel";
import { EmployeeLeaveRequestsPanel } from "@/components/dashboard/leave/EmployeeLeaveRequestsPanel";
import { LeaveManagerEmailsCell } from "@/components/dashboard/leave/LeaveManagerEmailsCell";

import {
  calendarDaysInclusive,
  normalizeCompOffRequestType,
  pickRowField,
} from "@/utils/compOff";
import { canPrimaryManagerActOnLeave, pickManagerEmailList } from "@/utils/leaveManagerDisplay";
import { compOffService } from "@/services/compOff.service";
import { UserRequestRejectDialog } from "@/components/dashboard/leave/UserRequestRejectDialog";
import { CompOffPageClient } from "@/components/comp-off/CompOffPageClient";

const LEAVE_REQUESTS_TABLE_MIN_HEIGHT = "min-h-[320px]";
function createDefaultLeaveRequestForm() {
  const today = todayApiDate();
  return {
    request_from_date: today,
    request_to_date: today,
    request_type: "LEAVE",
    comments: "",
    is_half_day: false,
    client_approval: false,
  };
}

function leaveRequestMatchesSearch(row: Record<string, unknown>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.request_type,
    row.requestType,
    formatUserRequestTypeLabel(row.request_type ?? row.requestType),
    row.request_from_date,
    row.requestFromDate,
    row.request_to_date,
    row.requestToDate,
    row.user_request_status,
    row.userRequestStatus,
    row.status,
    row.manager_status,
    row.managerStatus,
    row.manager_reason,
    row.managerReason,
    row.hr_status,
    row.hrStatus,
    row.hr_reason,
    row.hrReason,
    row.comments,
    row.employee_display,
    row.name,
    row.employee_name,
    row.employeeName,
    row.email,
    row.user_email,
    row.userEmail,
  ]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  return haystack.includes(q);
}

export function LeavePageClient() {
  const isManagerRoleLabel = (value: unknown): boolean =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .includes("manager");
  const { user, refresh: refreshSession } = useAuth();
  const dashboardAccess = useDashboardAccess();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteOnboardingRows, setInviteOnboardingRows] = useState<Array<Record<string, unknown>>>([]);
  const [invitedListFromDate, setInvitedListFromDate] = useState(
    () => defaultInvitedEmployeesDateRange().from
  );
  const [invitedListToDate, setInvitedListToDate] = useState(
    () => defaultInvitedEmployeesDateRange().to
  );
  const [invitedApiServerRange, setInvitedApiServerRange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const invitedListFromDateRef = useRef(invitedListFromDate);
  const invitedListToDateRef = useRef(invitedListToDate);
  invitedListFromDateRef.current = invitedListFromDate;
  invitedListToDateRef.current = invitedListToDate;
  const [allocations, setAllocations] = useState<Array<Record<string, unknown>>>([]);
  const [allocationForecastRows, setAllocationForecastRows] = useState<Array<Record<string, unknown>>>([]);
  const allocationRecordsRef = useRef<HTMLDivElement>(null);
  const projectCrudFormRef = useRef<HTMLDivElement>(null);
  const allocationFormRef = useRef<HTMLDivElement>(null);
  const [allocationRoles, setAllocationRoles] = useState<string[]>([]);
  const [allocationUsers, setAllocationUsers] = useState<
    Array<{ name: string; email: string; role?: string }>
  >([]);
  const [allocationProjects, setAllocationProjects] = useState<
    Array<{ code: string; name: string; project_type?: string }>
  >([]);
  const [allocationEmployeePickerOpen, setAllocationEmployeePickerOpen] = useState(false);
  const [allocationEmployeePickerQuery, setAllocationEmployeePickerQuery] = useState("");
  const allocationEmployeeComboboxRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [assignedProjects, setAssignedProjects] = useState<Array<Record<string, unknown>>>([]);
  const [profileAssignedProjects, setProfileAssignedProjects] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [timelogs, setTimelogs] = useState<Array<Record<string, unknown>>>([]);
  const [managerEmailsForHr, setManagerEmailsForHr] = useState<string[]>([]);
  const [timelogProjects, setTimelogProjects] = useState<Array<{ code: string; name: string }>>([]);
  const [hrTimelogDirectoryEmails, setHrTimelogDirectoryEmails] = useState<string[]>([]);
  const [timelogForm, setTimelogForm] = useState({
    project_code: "",
    log_date: "",
    hours: "1",
    description: "",
    /** HR/Admin: optional — submit timelog for this employee when the API accepts it */
    subject_employee_email: "",
  });
  const [teamRequestsLoading, setTeamRequestsLoading] = useState(false);
  const [employeeRequests, setEmployeeRequests] = useState<Array<Record<string, unknown>>>([]);
  const [kpis, setKpis] = useState<Array<Record<string, unknown>>>([]);
  const [headcountBreakdown, setHeadcountBreakdown] = useState<Array<Record<string, unknown>>>([]);
  const [roleBillingRows, setRoleBillingRows] = useState<Array<Record<string, unknown>>>([]);
  const [experienceBandRows, setExperienceBandRows] = useState<Array<Record<string, unknown>>>([]);
  const [utilizationByDepartmentRows, setUtilizationByDepartmentRows] = useState<Array<Record<string, unknown>>>([]);
  const [benchAgingRows, setBenchAgingRows] = useState<Array<Record<string, unknown>>>([]);
  const [offboardingUsers, setOffboardingUsers] = useState<Array<{ emp_id: string; name: string; email: string }>>([]);
  const [bgvUsers, setBgvUsers] = useState<
    Array<{ emp_id: string; name: string; email: string; role: string; level: string }>
  >([]);
  const [bgvRecords, setBgvRecords] = useState<Array<Record<string, unknown>>>([]);
  const [bgvDashboardRows, setBgvDashboardRows] = useState<Array<Record<string, unknown>>>([]);
  const [offboardingForm, setOffboardingForm] = useState({
    emp_id: "",
    resignation_date: "",
    last_working_day: "",
    separation_type: "VOLUNTARY" as "VOLUNTARY" | "INVOLUNTARY",
    reason: "",
    critical_skill: "",
    is_regretted: false,
  });
  const [bgvForm, setBgvForm] = useState({
    emp_id: "",
    name: "",
    role: "",
    level: "",
    consent_form_signed: "NO",
    identity: "",
    employment: "N/A",
    reference: "N/A",
    mail_id: "",
    onboarding_form: "PENDING",
    overall_status: "IN_PROGRESS",
    remarks: "",
  });
  const [attritionFyStartYear, setAttritionFyStartYear] = useState<string>(() => {
    const now = new Date();
    const year = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    return String(year);
  });
  const [attritionOverallRows, setAttritionOverallRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionVoluntaryRows, setAttritionVoluntaryRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionRoleWiseRows, setAttritionRoleWiseRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionManagerWiseRows, setAttritionManagerWiseRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionCriticalSkillRows, setAttritionCriticalSkillRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionRegrettedRows, setAttritionRegrettedRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionAverageTenureBuckets, setAttritionAverageTenureBuckets] = useState<Array<Record<string, unknown>>>([]);
  const [attritionAverageTenureSummaryRows, setAttritionAverageTenureSummaryRows] = useState<Array<Record<string, unknown>>>([]);
  const [attritionUpsertResultRows, setAttritionUpsertResultRows] = useState<Array<Record<string, unknown>>>([]);
  const [skillInventoryRows, setSkillInventoryRows] = useState<Array<Record<string, unknown>>>([]);
  const [contractDistributionRows, setContractDistributionRows] = useState<Array<Record<string, unknown>>>([]);
  const [bgvReportSearch, setBgvReportSearch] = useState("");
  const [bgvReportStatusFilter, setBgvReportStatusFilter] = useState("ALL");
  const [bgvReportEmploymentFilter, setBgvReportEmploymentFilter] = useState("ALL");
  const [bgvReportReferenceFilter, setBgvReportReferenceFilter] = useState("ALL");
  const [attritionForm, setAttritionForm] = useState({
    emp_id: "",
    separation_type: "VOLUNTARY" as "VOLUNTARY" | "INVOLUNTARY",
    reason: "",
    critical_skill: "",
    is_regretted: false,
    last_working_day: "",
  });
  const [utilizationFilters, setUtilizationFilters] = useState({
    page: "0",
    size: "10",
    search: "",
    as_of: "",
  });
  const [roleAssignForm, setRoleAssignForm] = useState({
    target_email: "",
    role: "ROLE_HR",
  });
  const [roleAssignUsers, setRoleAssignUsers] = useState<Array<{ name: string; email: string }>>([]);

  const [leaveRequestForm, setLeaveRequestForm] = useState(createDefaultLeaveRequestForm);
  const [selectedLeaveManagerEmails, setSelectedLeaveManagerEmails] = useState<string[]>([]);
  const [editingLeaveRequestId, setEditingLeaveRequestId] = useState<string>("");
  const [employeeRequestFilters, setEmployeeRequestFilters] = useState({
    fromDate: "",
    toDate: "",
    requestType: "ALL",
  });
  const [myLeaveSortId, setMyLeaveSortId] = useState(LEAVE_REQUEST_SORT_OPTIONS[0].id);
  const [teamLeaveSortId, setTeamLeaveSortId] = useState(LEAVE_REQUEST_SORT_OPTIONS[0].id);
  const [myLeaveSearch, setMyLeaveSearch] = useState("");
  const [teamLeaveSearch, setTeamLeaveSearch] = useState("");
  const [pendingReject, setPendingReject] = useState<{
    requestId: string;
    requestType: unknown;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [teamStatusUpdatingId, setTeamStatusUpdatingId] = useState<string | null>(null);

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
    full_name: "",
    phone_number: "",
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
    salary_slips: File | null;
  }>({
    resume: null,
    profile_photo: null,
    aadhaar: null,
    pan_card: null,
    reliving_letter: null,
    salary_slips: null,
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
    salary_slips: File | null;
  }>({
    reliving_letter: null,
    salary_slips: null,
  });
  const [selfProfilePic, setSelfProfilePic] = useState<File | null>(null);
  const [isEditingOwnProfile, setIsEditingOwnProfile] = useState(false);
  const priorEmploymentDocsForProfile = useMemo(() => {
    const raw = String(selfProfileForm.yoe ?? "").trim().replace(",", ".");
    if (!raw) return false;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0;
  }, [selfProfileForm.yoe]);
  const [projectForm, setProjectForm] = useState({
    project_name: "",
    project_type: "IN_HOUSE" as "IN_HOUSE" | "STAFFING" | "PRODUCT",
    client_name: "",
    account_manager_email: "",
  });
  const [editingProjectCode, setEditingProjectCode] = useState<string>("");
  const [projectFilters, setProjectFilters] = useState({
    search: "",
    project_type: "ALL",
  });
  const [managerProjects, setManagerProjects] = useState<Array<Record<string, unknown>>>([]);
  const [managerPortfolioRows, setManagerPortfolioRows] = useState<Array<Record<string, unknown>>>([]);
  const [selectedManagerProjectCode, setSelectedManagerProjectCode] = useState("");
  const [teamTimelogEmailFilter, setTeamTimelogEmailFilter] = useState("ALL");
  const managerDataLoadedRef = useRef(false);
  const managerDataLoadingRef = useRef(false);
  const managerProjectsRef = useRef<Array<Record<string, unknown>>>([]);
  const managerPortfolioRowsRef = useRef<Array<Record<string, unknown>>>([]);
  const timelogLoadInFlightRef = useRef(false);
  const [managerProjectAllocations, setManagerProjectAllocations] = useState<Array<Record<string, unknown>>>([]);
  const managerAllocationsCacheRef = useRef<Record<string, Array<Record<string, unknown>>>>({});
  const [allocationForm, setAllocationForm] = useState({
    allocation_id: "",
    employee_email: "",
    project_code: "",
    role: "",
    allocated_hours: "8",
    start_date: "",
    end_date: "",
    allocation_type: "DEPLOYABLE",
    billing_status: "BILLED" as "BILLED" | "BUFFER" | "INVESTMENT",
    is_manager: false,
  });
  const [editingAllocationId, setEditingAllocationId] = useState<string>("");
  const [allocationHrSubTab, setAllocationHrSubTab] = useState<"project" | "allocate" | "list">(
    "project"
  );
  const [timelogSubTab, setTimelogSubTab] = useState<"my" | "team">("my");
  const pathname = usePathname();
  const isTeamLeaveRoute = pathname.includes("/dashboard/leave/team");
  const [leaveSubTab, setLeaveSubTab] = useState<
    "my" | "team" | "comp-off" | "wfh" | "balances"
  >(isTeamLeaveRoute ? "team" : "my");
  useEffect(() => {
    if (isTeamLeaveRoute) {
      setLeaveSubTab((prev) => {
        if (prev === "comp-off" || prev === "balances" || prev === "team" || prev === "wfh") {
          return prev;
        }
        return "team";
      });
    } else if (pathname.includes("/dashboard/leave")) {
      setLeaveSubTab((prev) => {
        if (prev === "team") return "my";
        if (prev === "balances" || prev === "comp-off" || prev === "wfh") return prev;
        return "my";
      });
    }
  }, [isTeamLeaveRoute, pathname]);
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasAdminAccess = userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = userRoles.includes("ROLE_MANAGER");
  const hasDmAccess = hasDmRole(userRoles);

  const canViewTeamLeave = hasManagerAccess || hasHrAccess || hasDmAccess || (!hasHrAccess && !hasManagerAccess);
  const submitsToHrForReview = isAccountManagerEmployeeUser(userRoles);
  const userEmail = useMemo(() => String(user?.email ?? "").trim(), [user?.email]);
  const showSelfServeLeavePanel = leaveSubTab === "my" || leaveSubTab === "wfh";
  const myLeaveRequestsQ = useMyLeaveRequests(
    userEmail,
    Boolean(userEmail) && showSelfServeLeavePanel
  );
  const myLeaveRequests = myLeaveRequestsQ.rows;
  const myLeaveRequestsLoading = myLeaveRequestsQ.isFetching;
  const loadMyLeaveRequests = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: myLeaveRequestsQueryKey(userEmail) });
  }, [queryClient, userEmail]);
  const leaveAllocationsQ = useMyLeaveAllocations(
    dashboardAccess.canAccessProfile &&
      !dashboardAccess.requiresSelfOnboarding &&
      showSelfServeLeavePanel
  );
  const { data: accountManagerEmails = new Set<string>() } = useAccountManagerEmails(
    leaveSubTab === "team" && canViewTeamLeave
  );
  /** HR without manager portfolio — no allocated projects; use Team timelogs for org view */
  const timelogHrNoSelfProject =
    userRoles.includes("ROLE_HR") && !hasManagerAccess;
  const canExportTimelog = hasHrAccess || hasManagerAccess;
  const isEmployee = userRoles.includes("ROLE_EMPLOYEE");
  const requiresSelfOnboarding = dashboardAccess.requiresSelfOnboarding;
  /** Self-service profile + onboarding (non-HR employees only) */
  const employeeSelfServeProfile = isEmployee && !hasHrAccess;
  const canApplyCompOff = !hasHrAccess && !hasManagerAccess;
  const teamRequestType = employeeRequestFilters.requestType || "ALL";
  const showCompOffTab = canApplyCompOff || hasManagerAccess || hasHrAccess || hasDmAccess;
  const showLeaveSubTabBar = showCompOffTab || hasHrAccess || !isTeamLeaveRoute;
  const compOffForcedTab: "my" | "team" = canApplyCompOff ? "my" : "team";

  const leaveRequestTypeOptions = useMemo(() => {
    const base = USER_REQUEST_TYPE_SELECT_OPTIONS.filter((opt) => opt.value !== "WFH");
    if (!canApplyCompOff) return base;
    return [...base, { value: "COMP_OFF" as const, label: "Comp off" }];
  }, [canApplyCompOff]);

  const myAllocationRowsForLeave = useMemo(
    () => leaveAllocationsQ.data ?? profileAssignedProjects,
    [leaveAllocationsQ.data, profileAssignedProjects]
  );

  const requiresClientApproval = useMemo(
    () => activeAllocationsRequireClientApproval(myAllocationRowsForLeave),
    [myAllocationRowsForLeave]
  );

  useEffect(() => {
    if (leaveSubTab === "wfh") {
      setLeaveRequestForm((prev) =>
        prev.request_type === "WFH" ? prev : { ...prev, request_type: "WFH" }
      );
    } else if (leaveSubTab === "my") {
      setLeaveRequestForm((prev) =>
        prev.request_type === "WFH" ? { ...prev, request_type: "LEAVE" } : prev
      );
    }
  }, [leaveSubTab]);
  const canAccessProfile = Boolean(user);
  useEffect(() => {
    if (!hasManagerAccess && !hasHrAccess && timelogSubTab === "team") {
      setTimelogSubTab("my");
    }
  }, [hasManagerAccess, hasHrAccess, timelogSubTab]);
  useEffect(() => {
    if (!canViewTeamLeave && leaveSubTab === "team") {
      setLeaveSubTab("my");
    }
  }, [canViewTeamLeave, leaveSubTab]);

  const loadManagerData = useCallback(
    async (force = false) => {
      if (!hasManagerAccess) return { projectRows: [] as Array<Record<string, unknown>>, detailRows: [] as Array<Record<string, unknown>> };
      if (!force && managerDataLoadedRef.current) {
        return { projectRows: managerProjectsRef.current, detailRows: managerPortfolioRowsRef.current };
      }
      if (managerDataLoadingRef.current) {
        return { projectRows: managerProjectsRef.current, detailRows: managerPortfolioRowsRef.current };
      }
      managerDataLoadingRef.current = true;
      try {
        const [projectRes, detailRes] = await Promise.all([
          hrmsService.getManagerProjects(),
          hrmsService.getManagerProjectsWithRoles(),
        ]);
        const projectRows = toPagedRows(projectRes.data ?? projectRes);
        const detailRows = toPagedRows(detailRes.data ?? detailRes);
        // Fallback: if projects endpoint is empty but team-details has project info,
        // derive visible project list from detail rows.
        const effectiveProjectRows = projectRows.length ? projectRows : detailRows;
        setManagerProjects(effectiveProjectRows);
        setManagerPortfolioRows(detailRows);
        managerProjectsRef.current = effectiveProjectRows;
        managerPortfolioRowsRef.current = detailRows;
        managerDataLoadedRef.current = true;
        const fallbackProjectCode = managerProjectCode(effectiveProjectRows[0] ?? detailRows[0] ?? {});
        setSelectedManagerProjectCode((prev) => prev || fallbackProjectCode);
        return { projectRows: effectiveProjectRows, detailRows };
      } finally {
        managerDataLoadingRef.current = false;
      }
    },
    [hasManagerAccess]
  );

  useEffect(() => {
    if (leaveAllocationsQ.data) {
      setProfileAssignedProjects(leaveAllocationsQ.data);
    }
  }, [leaveAllocationsQ.data]);

  async function runAction(label: string, fn: () => Promise<unknown>) {
    setActionLoading(true);
    try {
      await fn();
      showSuccessToast(formatActionSuccessMessage(label));
    } catch (error) {
      const backendMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "";
      showErrorToast(formatActionErrorMessage(label, backendMessage));
    } finally {
      setActionLoading(false);
    }
  }

  const loadEmployeeRequestsForApprover = useCallback(async () => {
    const today = new Date();
    const future = new Date(today);
    future.setFullYear(future.getFullYear() + 2);
    const from = employeeRequestFilters.fromDate || `${today.getFullYear()}-01-01`;
    const to = employeeRequestFilters.toDate || future.toISOString().slice(0, 10);
    const requestType = employeeRequestFilters.requestType || "ALL";

    const rows = await listScopedUserRequests({
      fromDate: from,
      toDate: to,
      requestType,
      size: 500,
    });

    const deduped = Array.from(
      new Map(
        rows.map((row) => {
          const key = String(
            row.user_request_id ??
              row.userRequestId ??
              row.request_id ??
              row.requestId ??
              row.id ??
              Math.random()
          );
          return [key, row] as const;
        })
      ).values()
    );

    const enriched = deduped.map((row) => {
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
      const nameFromRow = String(
        row.employee_name ??
          row.employeeName ??
          row.name ??
          row.user_name ??
          row.userName ??
          row.emp_name ??
          row.empName ??
          row.requested_by_name ??
          row.requestedByName ??
          ""
      ).trim();
      const employee_display = nameFromRow || email || "—";
      return { ...row, employee_display };
    });
    setEmployeeRequests(enriched);
  }, [employeeRequestFilters]);

  const teamTableColCount = useMemo(() => {
    let count = 6;
    if (hasHrAccess) {
      return count + 2;
    }
    if (hasDmAccess) {
      count += 2;
    } else {
      count += 1;
    }
    if (!hasHrAccess) {
      count += 1;
    }
    return count;
  }, [hasDmAccess, hasHrAccess]);

  const fetchTeamRequests = useCallback(async () => {
      setTeamRequestsLoading(true);
      try {
        await loadEmployeeRequestsForApprover();
      } catch {
        setEmployeeRequests([]);
      } finally {
        setTeamRequestsLoading(false);
      }
    },
    [loadEmployeeRequestsForApprover]
  );

  useEffect(() => {
    if (!canViewTeamLeave) return;
    if (leaveSubTab !== "team") return;
    const timer = window.setTimeout(() => {
      void fetchTeamRequests();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    canViewTeamLeave,
    leaveSubTab,
    fetchTeamRequests,
    employeeRequestFilters.fromDate,
    employeeRequestFilters.toDate,
    employeeRequestFilters.requestType,
  ]);

  async function updateEmployeeRequestStatus(
    requestId: string,
    status: UserRequestStatusValue,
    options?: { reason?: string; requireReasonOnReject?: boolean }
  ) {
    const res = await updateUserRequestStatus(Number(requestId), status, options);
    const updated = extractStatusUpdateData(res);
    if (updated) {
      setEmployeeRequests((prev) =>
        prev.map((row) => {
          const rowId = String(
            row.user_request_id ??
              row.userRequestId ??
              row.request_id ??
              row.requestId ??
              row.id ??
              ""
          ).trim();
          return rowId === requestId ? mergeStatusUpdateIntoRow(row, updated) : row;
        })
      );
    }
  }

  function openRejectDialog(requestId: string, requestType: unknown) {
    setRejectReason("");
    setPendingReject({ requestId, requestType });
  }

  function closeRejectDialog() {
    setPendingReject(null);
    setRejectReason("");
  }

  async function confirmRejectRequest() {
    if (!pendingReject) return;
    const reason = rejectReason.trim();
    if (!reason) {
      throw new Error("Reason is required when rejecting a request.");
    }
    await updateEmployeeRequestStatus(pendingReject.requestId, "REJECTED", {
      reason,
      requireReasonOnReject: true,
    });
    closeRejectDialog();
    await loadEmployeeRequestsForApprover();
  }
  const filteredMyLeaveRequests = useMemo(
    () =>
      myLeaveRequests
        .filter(
          (row) =>
            normalizeCompOffRequestType(row.request_type ?? row.requestType) !== "COMP_OFF_EARN"
        )
        .filter((row) => leaveRequestMatchesSearch(row, myLeaveSearch)),
    [myLeaveRequests, myLeaveSearch]
  );

  const filteredLeaveTabRequests = useMemo(
    () =>
      filteredMyLeaveRequests.filter(
        (row) => normalizeUserRequestType(row.request_type ?? row.requestType) !== "WFH"
      ),
    [filteredMyLeaveRequests]
  );

  const filteredWfhTabRequests = useMemo(
    () =>
      myLeaveRequests
        .filter(
          (row) => normalizeUserRequestType(row.request_type ?? row.requestType) === "WFH"
        )
        .filter((row) => leaveRequestMatchesSearch(row, myLeaveSearch)),
    [myLeaveRequests, myLeaveSearch]
  );

  const filteredEmployeeRequests = useMemo(
    () => employeeRequests.filter((row) => leaveRequestMatchesSearch(row, teamLeaveSearch)),
    [employeeRequests, teamLeaveSearch]
  );

  const sortedLeaveTabRequests = useMemo(
    () => applyListSort(filteredLeaveTabRequests, myLeaveSortId, LEAVE_REQUEST_SORT_OPTIONS),
    [filteredLeaveTabRequests, myLeaveSortId]
  );

  const sortedWfhTabRequests = useMemo(
    () => applyListSort(filteredWfhTabRequests, myLeaveSortId, LEAVE_REQUEST_SORT_OPTIONS),
    [filteredWfhTabRequests, myLeaveSortId]
  );

  const activeSelfServeRequests =
    leaveSubTab === "wfh" ? sortedWfhTabRequests : sortedLeaveTabRequests;

  const sortedEmployeeRequests = useMemo(
    () => applyListSort(filteredEmployeeRequests, teamLeaveSortId, LEAVE_REQUEST_SORT_OPTIONS),
    [filteredEmployeeRequests, teamLeaveSortId]
  );

  const myLeavePagination = useClientPagination(activeSelfServeRequests, {
    resetKeys: [myLeaveSortId, myLeaveSearch, leaveSubTab],
  });

  const teamLeavePagination = useClientPagination(sortedEmployeeRequests, {
    resetKeys: [teamLeaveSortId, employeeRequestFilters, teamLeaveSearch],
  });

  const leaveTabItems = useMemo(() => {
    if (isTeamLeaveRoute) {
      return [
        canViewTeamLeave ? { value: "team", label: "Team Requests" } : null,
        hasHrAccess ? { value: "wfh", label: "WFH" } : null,
        showCompOffTab ? { value: "comp-off", label: "Comp Off Credit" } : null,
        hasHrAccess ? { value: "balances", label: "Balances" } : null,
      ].filter((item): item is { value: string; label: string } => Boolean(item));
    }

    return [
      { value: "my", label: "Leave Requests" },
      canViewTeamLeave && hasHrAccess
        ? { value: "team", label: "Team Requests" }
        : null,
      showCompOffTab ? { value: "comp-off", label: "Comp Off Credit" } : null,
      { value: "wfh", label: "WFH" },
      hasHrAccess ? { value: "balances", label: "Balances" } : null,
    ].filter((item): item is { value: string; label: string } => Boolean(item));
  }, [canViewTeamLeave, hasHrAccess, isTeamLeaveRoute, showCompOffTab]);

  return (
    <>
      <DashboardPageShell>
        <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
          <section className="rounded-2xl border border-wt-border bg-wt-surface-1">
                          {showLeaveSubTabBar ? (
                            <PageTabs
                              embedded
                              aria-label="Leave views"
                              value={leaveSubTab}
                              onValueChange={(value) =>
                                setLeaveSubTab(
                                  value as
                                    | "my"
                                    | "team"
                                    | "wfh"
                                    | "comp-off"
                                    | "balances"
                                )
                              }
                              items={leaveTabItems}
                            />
                          ) : null}
                          <div className={PAGE_TAB_BODY_CLASS}>
                          {leaveSubTab === "balances" && hasHrAccess ? (
                            <HrLeaveBalancesPanel actionLoading={actionLoading} runAction={runAction} />
                          ) : leaveSubTab === "comp-off" ? (
                            <CompOffPageClient
                              embedded
                              flowScope="earn"
                              forcedTab={compOffForcedTab}
                            />
                          ) : isTeamLeaveRoute && leaveSubTab === "wfh" && hasHrAccess ? (
                            <HrWfhRequestsPanel actionLoading={actionLoading} runAction={runAction} />
                          ) : leaveSubTab === "my" || leaveSubTab === "wfh" ? (
                        <EmployeeLeaveRequestsPanel
                          mode={leaveSubTab === "wfh" ? "wfh" : "leave"}
                          leaveRequestForm={leaveRequestForm}
                          onFormChange={setLeaveRequestForm}
                          leaveRequestTypeOptions={leaveRequestTypeOptions}
                          selectedLeaveManagerEmails={selectedLeaveManagerEmails}
                          onManagersChange={setSelectedLeaveManagerEmails}
                          editingLeaveRequestId={editingLeaveRequestId}
                          requiresClientApproval={requiresClientApproval}
                          submitsToHrForReview={submitsToHrForReview}
                          actionLoading={actionLoading}
                          myLeaveSearch={myLeaveSearch}
                          onSearchChange={setMyLeaveSearch}
                          myLeaveSortId={myLeaveSortId}
                          onSortChange={setMyLeaveSortId}
                          myLeavePagination={myLeavePagination}
                          activeRequests={activeSelfServeRequests}
                          totalFilteredCount={
                            leaveSubTab === "wfh"
                              ? filteredWfhTabRequests.length
                              : filteredLeaveTabRequests.length
                          }
                          myLeaveRequestsLoading={myLeaveRequestsLoading}
                          actorEmail={userEmail}
                          runAction={runAction}
                          onCancelEdit={() => {
                            setLeaveRequestForm(createDefaultLeaveRequestForm());
                            setSelectedLeaveManagerEmails([]);
                            setEditingLeaveRequestId("");
                          }}
                          onEditRequest={(row) => {
                            const requestId = String(
                              row.user_request_id ??
                                row.userRequestId ??
                                row.request_id ??
                                row.requestId ??
                                row.id ??
                                ""
                            ).trim();
                            const rowType = String(row.request_type ?? row.requestType ?? "LEAVE");
                            setLeaveRequestForm({
                              request_from_date: String(row.request_from_date ?? row.requestFromDate ?? ""),
                              request_to_date: String(row.request_to_date ?? row.requestToDate ?? ""),
                              request_type: rowType,
                              comments: String(row.comments ?? ""),
                              is_half_day: Boolean(row.is_half_day ?? row.isHalfDay ?? false),
                              client_approval: false,
                            });
                            setSelectedLeaveManagerEmails(
                              pickManagerEmailList(row as Record<string, unknown>, "primary")
                            );
                            setEditingLeaveRequestId(requestId);
                            if (normalizeUserRequestType(rowType) === "WFH") {
                              setLeaveSubTab("wfh");
                            } else {
                              setLeaveSubTab("my");
                            }
                          }}
                          onRevokeRequest={(row) => {
                            const requestId = String(
                              row.user_request_id ??
                                row.userRequestId ??
                                row.request_id ??
                                row.requestId ??
                                row.id ??
                                ""
                            ).trim();
                            void runAction(
                              userRequestActionLabel(row.request_type ?? row.requestType, "revoke"),
                              async () => {
                                await apiClient.delete(endpoints.userRequest.root, {
                                  contentType: "application/json",
                                  body: JSON.stringify({
                                    user_request_id: Number(requestId),
                                  }),
                                });
                                if (editingLeaveRequestId === requestId) {
                                  setEditingLeaveRequestId("");
                                  setLeaveRequestForm(createDefaultLeaveRequestForm());
                                }
                                await loadMyLeaveRequests();
                              }
                            );
                          }}
                          onSubmit={() =>
                            runAction(
                              userRequestActionLabel(
                                leaveSubTab === "wfh" ? "WFH" : leaveRequestForm.request_type,
                                editingLeaveRequestId ? "update" : "submit"
                              ),
                              async () => {
                                const fromDate = normalizeToApiDate(
                                  leaveRequestForm.request_from_date.trim()
                                );
                                const toDate = normalizeToApiDate(
                                  leaveRequestForm.request_to_date.trim()
                                );
                                if (!fromDate || !toDate) {
                                  throw new Error("From Date and To Date are required (dd/mm/yyyy).");
                                }
                                if (!parseApiDate(fromDate) || !parseApiDate(toDate)) {
                                  throw new Error("Please provide valid dates (dd/mm/yyyy).");
                                }
                                if (compareApiDates(toDate, fromDate) < 0) {
                                  throw new Error("To Date cannot be earlier than From Date.");
                                }
                                const comments = leaveRequestForm.comments.trim();
                                if (!comments) {
                                  throw new Error("Comments are required.");
                                }
                                if (comments.length > 200) {
                                  throw new Error("Comments must be 200 characters or less.");
                                }
                                if (leaveRequestForm.is_half_day && fromDate !== toDate) {
                                  throw new Error("Half-day request must be for one day.");
                                }
                                const requestType =
                                  leaveSubTab === "wfh" ? "WFH" : leaveRequestForm.request_type;
                                const needsClientApproval =
                                  requiresClientApproval &&
                                  (leaveSubTab === "wfh" ||
                                    normalizeUserRequestType(requestType) === "LEAVE");
                                if (needsClientApproval && !leaveRequestForm.client_approval) {
                                  throw new Error("Client approval is required for client users.");
                                }
                                if (
                                  leaveSubTab === "my" &&
                                  normalizeUserRequestType(requestType) === "LEAVE" &&
                                  !selectedLeaveManagerEmails.length
                                ) {
                                        throw new Error("Please select at least one approver.");
                                }
                                const isCompOffUsage =
                                  normalizeCompOffRequestType(requestType) === "COMP_OFF";
                                if (isCompOffUsage) {
                                  const days = calendarDaysInclusive(fromDate, toDate);
                                  if (days < 1) {
                                    throw new Error("Select at least one calendar day.");
                                  }
                                  const available =
                                    await compOffService.resolveAvailableUnits(fromDate);
                                  if (available < days) {
                                    throw new Error(
                                      `Insufficient comp-off balance. Available: ${
                                        Number.isFinite(available) ? available : 0
                                      }, requested: ${days} day(s).`
                                    );
                                  }
                                  const managerCompOffEmail =
                                    await compOffService.resolveUsageManagerCompOffEmail();
                                  if (!managerCompOffEmail) {
                                    throw new Error(
                                      "Could not resolve project manager for comp-off. Ensure you are allocated to a project with a manager."
                                    );
                                  }
                                  await compOffService.createUsageRequest({
                                    request_from_date: fromDate,
                                    request_to_date: toDate,
                                    request_type: "COMP_OFF",
                                    comments,
                                    manager_comp_off_email: managerCompOffEmail,
                                  });
                                  setLeaveRequestForm(createDefaultLeaveRequestForm());
                                  setSelectedLeaveManagerEmails([]);
                                  setEditingLeaveRequestId("");
                                  await loadMyLeaveRequests();
                                  return;
                                }
                                const payload = buildUserRequestBody(
                                  {
                                    request_from_date: fromDate,
                                    request_to_date: toDate,
                                    request_type: requestType,
                                    comments,
                                    is_half_day: leaveRequestForm.is_half_day,
                                    client_approval: needsClientApproval
                                      ? leaveRequestForm.client_approval
                                      : undefined,
                                    primary_manager_emails:
                                      leaveSubTab === "my" &&
                                      normalizeUserRequestType(requestType) === "LEAVE"
                                        ? selectedLeaveManagerEmails
                                        : undefined,
                                  },
                                  editingLeaveRequestId
                                    ? { userRequestId: Number(editingLeaveRequestId) }
                                    : undefined
                                );
                                if (editingLeaveRequestId) {
                                  await apiClient.put(endpoints.userRequest.root, {
                                    contentType: "application/json",
                                    body: JSON.stringify(payload),
                                  });
                                } else {
                                  await apiClient.post(endpoints.userRequest.root, {
                                    contentType: "application/json",
                                    body: JSON.stringify(payload),
                                  });
                                }
                                setLeaveRequestForm(createDefaultLeaveRequestForm());
                                setSelectedLeaveManagerEmails([]);
                                setEditingLeaveRequestId("");
                                await loadMyLeaveRequests();
                              }
                            )
                          }
                        />
                          ) : leaveSubTab === "team" && canViewTeamLeave ? (
                        <div className="space-y-4">
                          <div className="flex w-full items-end gap-3">
                            <div className="min-w-0 flex-[2]">
                              <InputField
                                label="Search"
                                type="search"
                                value={teamLeaveSearch}
                                onChange={setTeamLeaveSearch}
                                placeholder="Search by employee, type, status…"
                              />
                            </div>
                            <SelectField
                              label="Request Type"
                              value={employeeRequestFilters.requestType}
                              options={[...USER_REQUEST_FILTER_TYPE_OPTIONS]}
                              onChange={(v) => setEmployeeRequestFilters((p) => ({ ...p, requestType: v }))}
                              className="min-w-0 flex-1"
                            />
                            <ApiDateField
                              label="From Date"
                              value={employeeRequestFilters.fromDate}
                              onChange={(v) => setEmployeeRequestFilters((p) => ({ ...p, fromDate: v }))}
                              className="min-w-0 flex-1"
                            />
                            <ApiDateField
                              label="To Date"
                              value={employeeRequestFilters.toDate}
                              onChange={(v) => setEmployeeRequestFilters((p) => ({ ...p, toDate: v }))}
                              className="min-w-0 flex-1"
                            />
                            <Button
                              variant="brand"
                              type="button"
                              className="shrink-0 px-3 py-2 h-10"
                              onClick={() =>
                                runAction("Refresh team requests", () => fetchTeamRequests())
                              }
                              disabled={actionLoading || teamRequestsLoading}
                            >
                              Fetch Requests
                            </Button>
                          </div>

                          <ScrollableTable
                            maxHeightClass="max-h-[min(70vh,520px)]"
                            className={LEAVE_REQUESTS_TABLE_MIN_HEIGHT}
                          >
                            <WtTable>
                              <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead>
                                    <TableSortHeader
                                      label="Employee"
                                      activeDirection={activeSortDirectionForColumn(
                                        "employee",
                                        teamLeaveSortId,
                                        LEAVE_REQUEST_SORT_OPTIONS
                                      )}
                                      sortable
                                      onSort={() =>
                                        setTeamLeaveSortId(
                                          toggleColumnSort(
                                            "employee",
                                            teamLeaveSortId,
                                            LEAVE_REQUEST_SORT_OPTIONS
                                          )
                                        )
                                      }
                                    />
                                  </TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>
                                    <TableSortHeader
                                      label="From"
                                      activeDirection={activeSortDirectionForColumn(
                                        "from",
                                        teamLeaveSortId,
                                        LEAVE_REQUEST_SORT_OPTIONS
                                      )}
                                      sortable
                                      onSort={() =>
                                        setTeamLeaveSortId(
                                          toggleColumnSort(
                                            "from",
                                            teamLeaveSortId,
                                            LEAVE_REQUEST_SORT_OPTIONS
                                          )
                                        )
                                      }
                                    />
                                  </TableHead>
                                  <TableHead>To</TableHead>
                                  <TableHead>Primary Managers</TableHead>
                                  {hasHrAccess ? (
                                    <>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Reason</TableHead>
                                    </>
                                  ) : hasDmAccess ? (
                                    <>
                                      <TableHead>Final Status</TableHead>
                                      <TableHead>Status</TableHead>
                                    </>
                                  ) : (
                                    <TableHead>Status</TableHead>
                                  )}
                                  <TableHead>Comments</TableHead>
                                  {!hasHrAccess ? (
                                    <TableHead className="text-right">Actions</TableHead>
                                  ) : null}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {teamRequestsLoading ? (
                                  Array.from({ length: 5 }).map((_, rowIndex) => (
                                    <TableRow key={`team-leave-skeleton-${rowIndex}`}>
                                      {Array.from({ length: teamTableColCount }).map((_, colIndex) => (
                                        <TableCell key={colIndex} className="px-3 py-2">
                                          <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))
                                ) : teamLeavePagination.pageItems.length ? (
                                  teamLeavePagination.pageItems.map((row, idx) => {
                                    const requestId = String(
                                      row.user_request_id ??
                                        row.userRequestId ??
                                        row.request_id ??
                                        row.requestId ??
                                        row.id ??
                                        ""
                                    ).trim();
                                    const status = requestFinalStatus(row as Record<string, unknown>);
                                    const managerStatus = requestManagerStatus(row as Record<string, unknown>);
                                    const managerReason = String(
                                      pickRowField(
                                        row as Record<string, unknown>,
                                        "manager_reason",
                                        "managerReason"
                                      ) ?? ""
                                    ).trim();
                                    const rowRecord = row as Record<string, unknown>;
                                    const primaryManagers = pickManagerEmailList(rowRecord, "primary");
                                    const actorEmail = user?.email ?? "";
                                    const showPrimaryLeaveActions = canPrimaryManagerActOnLeave(
                                      rowRecord,
                                      actorEmail
                                    );
                                    const hrCanActOnRow = canHrShowTeamRequestActions(rowRecord, {
                                      hasHrAccess,
                                    });
                                    const showManagerActions =
                                      showPrimaryLeaveActions ||
                                      ((hasManagerAccess || hasDmAccess) &&
                                        !hrCanActOnRow &&
                                        canManagerActOnRequest(rowRecord, {
                                          hasManagerAccess,
                                          hasDmAccess,
                                          actorEmail,
                                        }));
                                    const showManagerReject =
                                      showPrimaryLeaveActions ||
                                      (showManagerActions &&
                                        canManagerRejectRequest(rowRecord, {
                                          hasManagerAccess,
                                          hasDmAccess,
                                          actorEmail,
                                        }));
                                    const blockedHint = hrTeamActionBlockedHint(rowRecord, { hasHrAccess });
                                    const isRowUpdating = teamStatusUpdatingId === requestId;
                                    const rowEmail = requestRowEmail(row as Record<string, unknown>);
                                    const isAm = rowEmail ? accountManagerEmails.has(rowEmail) : false;
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
                                      <TableRow key={`${requestId || "req"}-${idx}`}>
                                        <TableCell className="px-3 py-2 whitespace-nowrap">
                                          {employee || "—"}
                                          {isAm ? (
                                            <Badge variant="secondary" className={`ml-2 text-[10px] ${filledBadgeClass("info")}`}>
                                              AM
                                            </Badge>
                                          ) : null}
                                        </TableCell>
                                        <TableCell className="px-3 py-2 whitespace-nowrap">
                                          {formatUserRequestTypeLabel(row.request_type ?? row.requestType)}
                                        </TableCell>
                                        <TableCell className="px-3 py-2 whitespace-nowrap">{String(row.request_from_date ?? row.requestFromDate ?? "—")}</TableCell>
                                        <TableCell className="px-3 py-2 whitespace-nowrap">{String(row.request_to_date ?? row.requestToDate ?? "—")}</TableCell>
                                        <TableCell className="px-3 py-2 whitespace-nowrap">
                                          <LeaveManagerEmailsCell emails={primaryManagers} />
                                        </TableCell>
                                        {hasHrAccess ? (
                                          <>
                                            <TableCell className="px-3 py-2 whitespace-nowrap">
                                              {formatApprovalStageLabel(managerStatus)}
                                            </TableCell>
                                            <TableCell
                                              className="px-3 py-2 max-w-[220px] truncate"
                                              title={managerReason || undefined}
                                            >
                                              {managerReason || "—"}
                                            </TableCell>
                                          </>
                                        ) : hasDmAccess ? (
                                          <>
                                            <TableCell className="px-3 py-2 whitespace-nowrap">
                                              {formatApprovalStageLabel(status)}
                                            </TableCell>
                                            <TableCell className="px-3 py-2 whitespace-nowrap">
                                              {formatApprovalStageLabel(managerStatus)}
                                            </TableCell>
                                          </>
                                        ) : (
                                          <TableCell className="px-3 py-2 whitespace-nowrap">
                                            {formatApprovalStageLabel(status)}
                                          </TableCell>
                                        )}
                                        <TableCell className="px-3 py-2 max-w-[220px] truncate">{String(row.comments ?? "—")}</TableCell>
                                        {!hasHrAccess ? (
                                        <TableCell className="px-3 py-2 text-right">
                                          {hrCanActOnRow ? (
                                            <div className="inline-flex items-center justify-end gap-1">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="xs"
                                                className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10"
                                                disabled={actionLoading || !requestId || isRowUpdating}
                                                onClick={() =>
                                                  runAction(
                                                    userRequestActionLabel(
                                                      row.request_type ?? row.requestType,
                                                      "approve"
                                                    ),
                                                    async () => {
                                                      setTeamStatusUpdatingId(requestId);
                                                      try {
                                                        await updateEmployeeRequestStatus(
                                                          requestId,
                                                          "APPROVED",
                                                          { requireReasonOnReject: false }
                                                        );
                                                        await loadEmployeeRequestsForApprover();
                                                      } finally {
                                                        setTeamStatusUpdatingId(null);
                                                      }
                                                    }
                                                  )
                                                }
                                              >
                                                {isRowUpdating ? "…" : "Approve"}
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="destructive"
                                                size="xs"
                                                disabled={actionLoading || !requestId || isRowUpdating}
                                                onClick={() =>
                                                  runAction(
                                                    userRequestActionLabel(
                                                      row.request_type ?? row.requestType,
                                                      "reject"
                                                    ),
                                                    async () => {
                                                      setTeamStatusUpdatingId(requestId);
                                                      try {
                                                        await updateEmployeeRequestStatus(
                                                          requestId,
                                                          "REJECTED",
                                                          { requireReasonOnReject: false }
                                                        );
                                                        await loadEmployeeRequestsForApprover();
                                                      } finally {
                                                        setTeamStatusUpdatingId(null);
                                                      }
                                                    }
                                                  )
                                                }
                                              >
                                                Reject
                                              </Button>
                                            </div>
                                          ) : showManagerActions ? (
                                            <div className="inline-flex items-center justify-end gap-1">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="xs"
                                                className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10"
                                                disabled={actionLoading || !requestId}
                                                onClick={() =>
                                                  runAction(
                                                    userRequestActionLabel(
                                                      row.request_type ?? row.requestType,
                                                      "approve"
                                                    ),
                                                    async () => {
                                                      await updateEmployeeRequestStatus(requestId, "APPROVED", {
                                                        requireReasonOnReject: false,
                                                      });
                                                      await loadEmployeeRequestsForApprover();
                                                    }
                                                  )
                                                }
                                              >
                                                Approve
                                              </Button>
                                              {showManagerReject ? (
                                                <Button
                                                  type="button"
                                                  variant="destructive"
                                                  size="xs"
                                                  disabled={actionLoading || !requestId}
                                                  onClick={() =>
                                                    openRejectDialog(
                                                      requestId,
                                                      row.request_type ?? row.requestType
                                                    )
                                                  }
                                                >
                                                  Reject
                                                </Button>
                                              ) : null}
                                            </div>
                                          ) : blockedHint ? (
                                            <span className="text-xs text-wt-text-muted">{blockedHint}</span>
                                          ) : (
                                            <span className="text-wt-text-muted">—</span>
                                          )}
                                        </TableCell>
                                        ) : null}
                                      </TableRow>
                                    );
                                  })
                                ) : (
                                  <TableRow className="hover:bg-transparent">
                                    <TableCell
                                      colSpan={teamTableColCount}
                                      className="h-[280px] text-center align-middle text-sm text-wt-text-muted"
                                    >
                                      {employeeRequests.length
                                        ? "No requests match your search."
                                        : "No Data"}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </WtTable>
                          </ScrollableTable>
                          {sortedEmployeeRequests.length > 0 ? (
                            <ListPagination
                              className="mt-3"
                              page={teamLeavePagination.page}
                              totalPages={teamLeavePagination.totalPages}
                              totalItems={teamLeavePagination.totalItems}
                              rangeStart={teamLeavePagination.rangeStart}
                              rangeEnd={teamLeavePagination.rangeEnd}
                              pageSize={teamLeavePagination.pageSize}
                              pageSizeOptions={teamLeavePagination.pageSizeOptions}
                              onPageChange={teamLeavePagination.setPage}
                              onPageSizeChange={teamLeavePagination.setPageSize}
                            />
                          ) : null}
                        </div>
                          ) : null}
                          </div>
                        </section>
        </OnboardingGate>
      </DashboardPageShell>
            <UserRequestRejectDialog
              open={Boolean(pendingReject)}
              title={
                pendingReject
                  ? userRequestActionLabel(pendingReject.requestType, "reject")
                  : "Reject request"
              }
              description="A reason is required when a manager rejects. HR reject does not use this dialog."
              reasonPlaceholder="Enter rejection reason"
              confirmLabel="Reject"
              confirmingLabel="Rejecting…"
              reason={rejectReason}
              onReasonChange={setRejectReason}
              onCancel={closeRejectDialog}
              onConfirm={() =>
                runAction(
                  pendingReject
                    ? userRequestActionLabel(pendingReject.requestType, "reject")
                    : "Reject request",
                  confirmRejectRequest
                )
              }
              loading={actionLoading}
            />
    </>
  );
}
