"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiClient, type ApiEnvelope } from "@/api/httpClient";
import { endpoints } from "@/api/endpoints";
import { hrmsService, type PagedData } from "@/services/hrms.service";
import { useOverviewData } from "@/hooks/useOverviewData";
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
import { loadSelfProfileState } from "@/utils/selfProfile";
import { AttritionRetentionReports } from "@/components/reports/AttritionRetentionReports";
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
  buildUserIdToNameMap,
  buildEmailToNameMap,
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
import { InputField, SelectField, TextAreaField, FileField, UploadTile } from "@/components/dashboard/ui/forms";
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
  listSelfUserRequests,
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
import { LeaveBalanceSummary } from "@/components/dashboard/leave/LeaveBalanceSummary";
import { HrLeaveBalancesPanel } from "@/components/dashboard/leave/HrLeaveBalancesPanel";
import { ManagerTeamOnLeavePanel } from "@/components/dashboard/leave/ManagerTeamOnLeavePanel";
import { LeaveWorkflowNotice } from "@/components/dashboard/leave/LeaveWorkflowNotice";
import { LeaveManagerSelector } from "@/components/dashboard/leave/LeaveManagerSelector";
import { LeaveAdditionalRecipientsSelector } from "@/components/dashboard/leave/LeaveAdditionalRecipientsSelector";

import {
  calendarDaysInclusive,
  normalizeCompOffRequestType,
  pickRowField,
} from "@/utils/compOff";
import { compOffService } from "@/services/compOff.service";
import { UserRequestRejectDialog } from "@/components/dashboard/leave/UserRequestRejectDialog";
import { CompOffPageClient } from "@/components/comp-off/CompOffPageClient";

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
  const userEmail = useMemo(() => String(user?.email ?? "").trim(), [user?.email]);
  const leaveRequestsLoadInFlight = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { metrics, loading, refresh } = useOverviewData();
    const [actionLoading, setActionLoading] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<Record<string, unknown> | null>(null);
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
  const [profileAssignedProjectsLoading, setProfileAssignedProjectsLoading] = useState(false);
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
  const [myLeaveRequests, setMyLeaveRequests] = useState<Array<Record<string, unknown>>>([]);
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
  const [selectedAdditionalRecipientEmails, setSelectedAdditionalRecipientEmails] = useState<string[]>([]);
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
  const [isSelfOnboarded, setIsSelfOnboarded] = useState<boolean>(user?.status === "ACTIVE");
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
    "my" | "team" | "org" | "comp-off" | "wfh" | "balances"
  >(isTeamLeaveRoute ? "team" : "my");
  useEffect(() => {
    if (isTeamLeaveRoute) {
      setLeaveSubTab((prev) => {
        if (prev === "comp-off" || prev === "balances" || prev === "team" || prev === "org") {
          return prev;
        }
        return "team";
      });
    } else if (pathname.includes("/dashboard/leave")) {
      setLeaveSubTab((prev) => {
        if (prev === "team" || prev === "org") return "my";
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

  const canViewTeamLeave = hasManagerAccess || hasHrAccess || hasDmAccess;
  const firstLineStatusColumnLabel = hasHrAccess
    ? "Manager/DM status"
    : hasDmAccess && !hasManagerAccess
      ? "DM status"
      : "Manager status";
  const submitsToHrForReview = isAccountManagerEmployeeUser(userRoles);
  const { data: accountManagerEmails = new Set<string>() } = useAccountManagerEmails();
  /** HR without manager portfolio — no allocated projects; use Team timelogs for org view */
  const timelogHrNoSelfProject =
    userRoles.includes("ROLE_HR") && !hasManagerAccess;
  const canExportTimelog = hasHrAccess || hasManagerAccess;
  const isEmployee = userRoles.includes("ROLE_EMPLOYEE");
  const restrictForPendingOnboarding =
    isEmployee && !hasHrAccess && !hasManagerAccess;
  const requiresSelfOnboarding = restrictForPendingOnboarding && !isSelfOnboarded;
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
    () => (assignedProjects.length ? assignedProjects : profileAssignedProjects),
    [assignedProjects, profileAssignedProjects]
  );

  const requiresClientApproval = useMemo(
    () => activeAllocationsRequireClientApproval(myAllocationRowsForLeave),
    [myAllocationRowsForLeave]
  );

  const leaveWorkflowVariant = useMemo((): Parameters<typeof LeaveWorkflowNotice>[0]["variant"] => {
    if (isTeamLeaveRoute && hasHrAccess) return "hr";
    if (hasDmAccess && !hasManagerAccess) return "dm";
    if (hasManagerAccess) return "manager";
    return "employee";
  }, [hasDmAccess, hasHrAccess, hasManagerAccess, isTeamLeaveRoute]);

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
    if (leaveSubTab === "org" && !hasHrAccess) {
      setLeaveSubTab("team");
    }
  }, [leaveSubTab, hasHrAccess]);

  useEffect(() => {
    if (!canViewTeamLeave && (leaveSubTab === "team" || leaveSubTab === "org")) {
      setLeaveSubTab("my");
    }
  }, [canViewTeamLeave, leaveSubTab]);

  const loadManagerData = useCallback(
    async (force = false) => {
      if (!hasManagerAccess) return { projectRows: [] as Array<Record<string, unknown>>, detailRows: [] as Array<Record<string, unknown>> };
      if (!force && managerDataLoadedRef.current) {
        return { projectRows: managerProjects, detailRows: managerPortfolioRows };
      }
      if (managerDataLoadingRef.current) {
        return { projectRows: managerProjects, detailRows: managerPortfolioRows };
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
        managerDataLoadedRef.current = true;
        const fallbackProjectCode = managerProjectCode(effectiveProjectRows[0] ?? detailRows[0] ?? {});
        setSelectedManagerProjectCode((prev) => prev || fallbackProjectCode);
        return { projectRows: effectiveProjectRows, detailRows };
      } finally {
        managerDataLoadingRef.current = false;
      }
    },
    [hasManagerAccess, managerProjects, managerPortfolioRows]
  );

  const loadAllProjectsForHr = useCallback(async () => {
    const res = await hrmsService.getProjects({ page: "0", size: "500" });
    const rows = toRows(res.data);
    if (rows.length) return rows;
    const fallback = await hrmsService.getAllProjects({});
    return toRows(fallback.data ?? fallback);
  }, []);

  const priorEmploymentDocsRequired = useMemo(() => {
    const raw = String(selfOnboardForm.yoe ?? "").trim().replace(",", ".");
    if (!raw) return false;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0;
  }, [selfOnboardForm.yoe]);

  const loadMyProfile = useCallback(async () => {
    const { profile, isSelfOnboarded: onboarded } = await loadSelfProfileState(userRoles, user);
    setEmployeeProfile(profile);
    setIsSelfOnboarded(onboarded);
  }, [user, userRoles]);
  useEffect(() => {
    if (!user) return;
    const id = window.setTimeout(() => {
      void loadMyProfile();
    }, 0);
    return () => window.clearTimeout(id);
  }, [user, loadMyProfile]);
  useEffect(() => {
    if (requiresSelfOnboarding) return;
    const id = window.setTimeout(() => {
      void (async () => {
        setProfileAssignedProjectsLoading(true);
        try {
          const [assignedRes, myAllocationsRes] = await Promise.all([
            hrmsService.getAssignedProjects(),
            hrmsService.getMyAllocations(),
          ]);
          const normalizedProjects = normalizeAssignedProjects(
            toPagedRows(assignedRes.data ?? assignedRes)
          );
          const myAllocations = toPagedRows(myAllocationsRes.data ?? myAllocationsRes);
          setProfileAssignedProjects(
            mergeProjectAndAllocationData(normalizedProjects, myAllocations)
          );
        } catch {
          setProfileAssignedProjects([]);
        } finally {
          setProfileAssignedProjectsLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [canAccessProfile, requiresSelfOnboarding]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const [bandsRes, departmentsRes] = await Promise.all([
            hrmsService.getBands(),
            hrmsService.getDepartments(),
          ]);
          const rows = toRows(bandsRes);
          setOnboardBands(rows);

          let departments = Array.from(
            new Set(
              toPagedRows((departmentsRes as { data?: unknown }).data ?? departmentsRes)
                .map((row) =>
                  String(
                    row.department ??
                      row.department_name ??
                      row.departmentName ??
                      row.name ??
                      row.value ??
                      ""
                  ).trim()
                )
                .filter((value) => Boolean(value))
            )
          ).sort();

          // Fallback only if departments API returns nothing.
          if (!departments.length) {
            departments = Array.from(
              new Set(
                rows
                  .map((row) => String(row.stream ?? row.department ?? "").trim())
                  .filter((value) => Boolean(value))
              )
            ).sort();
          }
          if (!departments.length) {
            const kpiRes = await hrmsService.getKpis({ limit: "200", offset: "0" });
            const kpiRows = toRows((kpiRes as { data?: unknown }).data ?? kpiRes);
            departments = Array.from(
              new Set(
                kpiRows
                  .map((row) => String(row.department ?? "").trim())
                  .filter((value) => Boolean(value))
              )
            ).sort();
          }
          setOnboardDepartments(
            Array.from(
              new Set([...HARDCODED_DEPARTMENT_OPTIONS, ...departments])
            ).sort()
          );
        } catch {
          setOnboardDepartments(HARDCODED_DEPARTMENT_OPTIONS);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!onboardForm.band_id) {
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const bandId = String(onboardForm.band_id);
          const departmentsToQuery = onboardDepartments;
          if (!departmentsToQuery.length) {
            setBandDeptRoleMap({});
            return;
          }
          const deptResults = await Promise.allSettled(
            departmentsToQuery.map(async (department) => {
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
          const deptEntries = deptResults
            .filter(
              (
                result
              ): result is PromiseFulfilledResult<{ department: string; roles: string[] }> =>
                result.status === "fulfilled"
            )
            .map((result) => result.value);

          const nextMap = deptEntries.reduce<Record<string, string[]>>((acc, item) => {
            acc[item.department] = item.roles;
            return acc;
          }, {});

          setBandDeptRoleMap(nextMap);
          const resolvedDepartment = departmentsToQuery.includes(onboardForm.department)
            ? onboardForm.department
            : departmentsToQuery[0] ?? "";
          const resolvedRoles = nextMap[resolvedDepartment] ?? [];

          if (
            resolvedDepartment !== onboardForm.department ||
            (onboardForm.role && !resolvedRoles.includes(onboardForm.role))
          ) {
            setOnboardForm((prev) => ({
              ...prev,
              department: resolvedDepartment,
              role: resolvedRoles.includes(prev.role) ? prev.role : resolvedRoles[0] ?? "",
            }));
          }
        } catch {
          setBandDeptRoleMap({});
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [onboardForm.band_id, onboardForm.department, onboardForm.role, onboardDepartments]);
  useEffect(() => {
    const hasAllocationAccess =
      (user?.roles ?? []).includes("ROLE_HR") || (user?.roles ?? []).includes("ROLE_ADMIN");
    if (!hasAllocationAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const [response, onboardRes, projectRes] = await Promise.all([
            hrmsService.getAllocationRoles({}),
            hrmsService.getOnboardList({
              page: "0",
              size: "500",
              onboardingStatus: "ACTIVE",
            }),
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
          const isActiveOnboardRow = (row: Record<string, unknown>) =>
            String(row.status ?? "").trim().toUpperCase() === "ACTIVE";
          let userRows = toPagedRows(onboardRes.data ?? onboardRes).filter(isActiveOnboardRow);
          if (!userRows.length) {
            const fallbackOnboard = await hrmsService.getOnboardList({ page: "0", size: "500" });
            userRows = toPagedRows(fallbackOnboard.data ?? fallbackOnboard).filter(isActiveOnboardRow);
          }
          const users = Array.from(
            new Map(
              userRows
                .map((row) => {
                  const email = String(row.email ?? "").trim();
                  const name = String(row.name ?? email).trim();
                  const role = String(
                    row.role ?? row.designation ?? row.designation_name ?? row.designationName ?? ""
                  ).trim();
                  if (!email) return null;
                  return [email.toLowerCase(), { name, email, ...(role ? { role } : {}) }] as const;
                })
                .filter(
                  (x): x is readonly [string, { name: string; email: string; role?: string }] => Boolean(x)
                )
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
                  const project_type = String(row.project_type ?? row.projectType ?? "").trim();
                  return [code, { code, name, project_type }] as [
                    string,
                    { code: string; name: string; project_type: string },
                  ];
                })
                .filter(
                  (x): x is [string, { code: string; name: string; project_type: string }] => x != null
                )
            ).values()
          ).sort((a, b) => a.name.localeCompare(b.name));
          setAllocationProjects(projects);
          const onboardEmailToName = buildEmailToNameMap(userRows);
          const projectDisplayByCode = buildProjectCodeDisplayMap(projectRows);

          try {
            const forecastRes = await hrmsService.getAllocationForecasting({ days: 14 });
            const forecastRows = toPagedRows((forecastRes as { data?: unknown }).data ?? forecastRes);
            setAllocationForecastRows(
              normalizeForecastRows(forecastRows, {
                emailToName: onboardEmailToName,
                projectDisplayByCode,
              })
            );
          } catch {
            setAllocationForecastRows([]);
          }
        } catch {
          setAllocationRoles([]);
          setAllocationUsers([]);
          setAllocationProjects([]);
          setAllocationForecastRows([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [user?.roles]);
  useEffect(() => {
    if (!(userRoles.includes("ROLE_ADMIN") || userRoles.includes("ROLE_HR"))) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getOnboardList({ page: "0", size: "200" });
          const rows = toPagedRows((res as { data?: unknown }).data ?? res);
          const users = Array.from(
            new Map(
              rows
                .map((row) => {
                  const email = String(row.email ?? "").trim();
                  if (!email) return null;
                  const name = String(row.name ?? email).trim();
                  return [email.toLowerCase(), { name, email }] as const;
                })
                .filter((entry): entry is readonly [string, { name: string; email: string }] => Boolean(entry))
            ).values()
          ).sort((a, b) => a.name.localeCompare(b.name));
          setRoleAssignUsers(users);
        } catch {
          setRoleAssignUsers([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [userRoles]);
  useEffect(() => {
    if (hasManagerAccess) return;
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
  }, [hasManagerAccess]);  useEffect(() => {
    if (!hasHrAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "200" });
          const rows = toPagedRows(onboardRes.data ?? onboardRes);
          const emails = Array.from(
            new Set(
              rows
                .map((row) =>
                  String(row.email ?? row.user_email ?? row.userEmail ?? "").trim().toLowerCase()
                )
                .filter(Boolean)
            )
          ).sort();
          setHrTimelogDirectoryEmails(emails);
        } catch {
          setHrTimelogDirectoryEmails([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [hasHrAccess, requiresSelfOnboarding]);
  useEffect(() => {
    if (timelogSubTab !== "team" || !hasManagerAccess) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          await loadManagerData();
        } catch {
          setManagerProjects([]);
          setManagerPortfolioRows([]);
          setSelectedManagerProjectCode("");
          managerDataLoadedRef.current = false;
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [timelogSubTab, hasManagerAccess, loadManagerData]);
  useEffect(() => {
    if (!hasManagerAccess) return;
    if (timelogSubTab !== "team") return;
    const code = selectedManagerProjectCode.trim();
    if (!code) {
      setManagerProjectAllocations([]);
      return;
    }

    const cacheKey = code.toLowerCase();
    const cached = managerAllocationsCacheRef.current[cacheKey];
    if (cached) {
      setManagerProjectAllocations(cached);
      return;
    }

    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getAllocations({
            page: "0",
            size: "200",
            projectCode: code,
          });
          const rows = toPagedRows(res.data ?? res);
          managerAllocationsCacheRef.current[cacheKey] = rows;
          setManagerProjectAllocations(rows);
        } catch {
          setManagerProjectAllocations([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [timelogSubTab, hasManagerAccess, selectedManagerProjectCode]);
  const loadMyLeaveRequests = useCallback(async () => {
    if (!userEmail) {
      setMyLeaveRequests([]);
      return;
    }
    if (leaveRequestsLoadInFlight.current) return;
    leaveRequestsLoadInFlight.current = true;
    try {
      const today = new Date();
      const future = new Date(today);
      future.setFullYear(future.getFullYear() + 2);
      const merged = await listSelfUserRequests({
        fromDate: "01/01/2000",
        toDate: formatApiDate(future),
        requestType: "ALL",
        empEmail: userEmail,
      });
      const deduped = Array.from(
        new Map(
          merged.map((row) => {
            const key = String(row.user_request_id ?? row.userRequestId ?? row.id ?? Math.random());
            return [key, row] as const;
          })
        ).values()
      );
      setMyLeaveRequests(deduped);
    } finally {
      leaveRequestsLoadInFlight.current = false;
    }
  }, [userEmail]);

  useEffect(() => {
    void loadMyLeaveRequests().catch(() => {
      setMyLeaveRequests([]);
    });
  }, [loadMyLeaveRequests]);
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

  function normalizeForecastRows(
    rows: Array<Record<string, unknown>>,
    ctx: {
      emailToName: Record<string, string>;
      projectDisplayByCode: Record<string, string>;
    }
  ) {
    const { emailToName, projectDisplayByCode } = ctx;
    return rows.map((row) => {
      const email = allocationRowEmail(row);
      const employeeName = String(
        row.employee_name ??
          row.employeeName ??
          row.user_name ??
          row.userName ??
          (email ? emailToName[email] : "") ??
          ""
      ).trim();

      const code = allocationProjectCode(row) || String(row.project_code ?? row.projectCode ?? "").trim();
      const titleOnRow = allocationProjectTitleFromRow(row);
      const mapped = code ? projectDisplayByCode[code] ?? "" : "";
      const mappedName = mapped.includes("—")
        ? mapped.split("—").slice(1).join("—").trim()
        : mapped.trim();
      const projectName = String(
        row.project_name ?? row.projectName ?? titleOnRow ?? mappedName ?? ""
      ).trim();

      return {
        ...row,
        project_code: code || "—",
        project_name: projectName || "—",
        employee_name: employeeName || "—",
        employee_email: email || "—",
        role: String(row.role ?? row.project_role ?? row.projectRole ?? row.designation ?? "—").trim() || "—",
        billing_status: String(row.billing_status ?? row.billingStatus ?? "—").trim() || "—",
        end_date: String(row.end_date ?? row.endDate ?? "—").trim() || "—",
      } as Record<string, unknown>;
    });
  }

  function normalizeAssignedProjects(rows: Array<Record<string, unknown>>) {
    return rows.map((row) => {
      const isManagerRaw = row.is_manager ?? null;
      const isManager =
        isManagerFlagTruthy(isManagerRaw) || isManagerRoleLabel(row.role ?? row.designation)
          ? "Yes"
          : "No";

      return {
        project_code: row.project_code ?? row.projectCode ?? row.code ?? "—",
        project_name: row.project_name ?? row.projectName ?? row.name ?? "—",
        project_type: row.project_type ?? row.projectType ?? "—",
        role: row.role ?? row.designation ?? "—",
        allocated_hours: row.allocated_hours ?? row.allocatedHours ?? row.hours ?? "—",
        billing_status: row.billing_status ?? row.billingStatus ?? "—",
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
        const existing = acc[key];
        if (!existing) {
          acc[key] = row;
          return acc;
        }
        const existingIsManager =
          isManagerFlagTruthy(existing.is_manager) ||
          isManagerRoleLabel(existing.role ?? existing.designation);
        const nextIsManager =
          isManagerFlagTruthy(row.is_manager) ||
          isManagerRoleLabel(row.role ?? row.designation);
        // Prefer a manager allocation row when multiple users share a project code.
        acc[key] = nextIsManager && !existingIsManager ? row : existing;
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
        billing_status:
          row.billing_status === "—"
            ? allocation.billing_status ?? allocation.billingStatus ?? "—"
            : row.billing_status,
        is_manager:
          row.is_manager === "No" &&
          (allocation.is_manager !== undefined || isManagerRoleLabel(allocation.role ?? allocation.designation))
            ? (() => {
                const raw = allocation.is_manager;
                return isManagerFlagTruthy(raw) || isManagerRoleLabel(allocation.role ?? allocation.designation);
              })()
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

  function managerProjectCode(row: Record<string, unknown>) {
    const nestedProject = row.project as Record<string, unknown> | undefined;
    return String(
      row.project_code ??
        row.projectCode ??
        row.project_code_id ??
        row.projectCodeId ??
        row.allocated_project ??
        row.code ??
        nestedProject?.project_code ??
        nestedProject?.projectCode ??
        nestedProject?.code ??
        row.project_id ??
        row.projectId ??
        ""
    ).trim();
  }

  function managerProjectName(row: Record<string, unknown>) {
    const nestedProject = row.project as Record<string, unknown> | undefined;
    return String(
      row.project_name ??
        row.projectName ??
        row.name ??
        row.allocated_project_name ??
        nestedProject?.project_name ??
        nestedProject?.projectName ??
        nestedProject?.name ??
        ""
    ).trim();
  }

  function managerTeamEmails(rows: Array<Record<string, unknown>>) {
    return Array.from(
      new Set(
        rows
          .flatMap((row) => {
            const direct = String(
              row.employee_email ?? row.email ?? row.user_email ?? row.userEmail ?? ""
            )
              .trim()
              .toLowerCase();
            const nestedEmployees = Array.isArray(row.employees)
              ? (row.employees as Array<Record<string, unknown>>)
                  .map((emp) =>
                    String(emp.email ?? emp.user_email ?? emp.userEmail ?? "")
                      .trim()
                      .toLowerCase()
                  )
                  .filter(Boolean)
              : [];
            return [direct, ...nestedEmployees];
          })
          .filter(Boolean)
      )
    );
  }

  function managerTeamRowsForProject(
    rows: Array<Record<string, unknown>>,
    projectCode: string
  ) {
    const normalizedCode = projectCode.trim().toLowerCase();
    if (!normalizedCode) return [];
    return rows
      .filter((row) => managerProjectCode(row).trim().toLowerCase() === normalizedCode)
      .flatMap((row) => {
        const nestedEmployees = Array.isArray(row.employees)
          ? (row.employees as Array<Record<string, unknown>>)
          : [];
        const nestedUser =
          (row.user as Record<string, unknown> | undefined) ??
          (row.employee as Record<string, unknown> | undefined) ??
          (row.member as Record<string, unknown> | undefined) ??
          (row.user_master as Record<string, unknown> | undefined) ??
          (row.userMaster as Record<string, unknown> | undefined);
        const projectName = managerProjectName(row);
        const projectType = String(
          row.project_type ??
            row.projectType ??
            row.type ??
            (row.project as Record<string, unknown> | undefined)?.project_type ??
            (row.project as Record<string, unknown> | undefined)?.projectType ??
            "—"
        ).trim();
        const employeeFromRow = String(
          row.employee_name ??
            row.employeeName ??
            row.emp_name ??
            row.empName ??
            row.name ??
            row.user_name ??
            row.userName ??
            nestedUser?.name ??
            nestedUser?.employee_name ??
            nestedUser?.employeeName ??
            row.email ??
            row.user_email ??
            ""
        ).trim();
        const emailFromRow = String(
          row.email ??
            row.user_email ??
            row.userEmail ??
            row.employee_email ??
            row.employeeEmail ??
            row.emp_email ??
            row.empEmail ??
            nestedUser?.email ??
            nestedUser?.user_email ??
            nestedUser?.userEmail ??
            ""
        ).trim();
        const roleFromRow = String(
          row.role ??
            row.designation ??
            row.employee_role ??
            row.employeeRole ??
            nestedUser?.role ??
            nestedUser?.designation ??
            "—"
        ).trim();
        if (nestedEmployees.length) {
          return nestedEmployees.map((emp) => ({
            project_code: managerProjectCode(row) || "—",
            project_name: projectName || "—",
            project_type: projectType || "—",
            employee: String(emp.name ?? emp.employee_name ?? emp.employeeName ?? "—").trim() || "—",
            email: String(emp.email ?? emp.user_email ?? emp.userEmail ?? "—").trim() || "—",
            role: String(emp.project_role ?? emp.role ?? emp.designation ?? "—").trim() || "—",
            allocated_hours: formatAllocatedHoursPercentLabel(
              emp.allocated_hours ?? emp.allocatedHours ?? row.allocated_hours
            ),
            allocation_type: String(emp.allocation_type ?? emp.allocationType ?? row.allocation_type ?? "—").trim(),
            is_manager: String(emp.is_manager ?? emp.isManager ?? row.is_manager ?? "—").trim(),
            start_date: String(emp.start_date ?? emp.startDate ?? row.start_date ?? "—").trim(),
            end_date: String(emp.end_date ?? emp.endDate ?? row.end_date ?? "—").trim(),
          }));
        }
        return [{
          project_code: managerProjectCode(row) || "—",
          project_name: projectName || "—",
          project_type: projectType || "—",
          employee: employeeFromRow || "—",
          email: emailFromRow || "—",
          role: roleFromRow || "—",
          allocated_hours: formatAllocatedHoursPercentLabel(
            row.allocated_hours ?? row.allocatedHours ?? row.hours
          ),
          allocation_type: String(row.allocation_type ?? row.allocationType ?? "—").trim(),
          is_manager: String(row.is_manager ?? row.isManager ?? "—").trim(),
          start_date: String(row.start_date ?? row.startDate ?? "—").trim(),
          end_date: String(row.end_date ?? row.endDate ?? "—").trim(),
        }];
      })
      .filter((row) => row.employee !== "—" || row.email !== "—");
  }

  const availableOnboardRoles = bandDeptRoleMap[onboardForm.department] ?? [];
  const internBandId = useMemo(() => resolveInternBandId(onboardBands), [onboardBands]);
  useEffect(() => {
    if (onboardForm.user_type !== "INTERN") return;
    setOnboardForm((prev) =>
      prev.band_id === internBandId ? prev : { ...prev, band_id: internBandId }
    );
  }, [onboardForm.user_type, internBandId]);
  const defaultConsultantBandId = useMemo(() => {
    const first = onboardBands[0];
    const id = first?.id != null ? Number(first.id) : NaN;
    return Number.isFinite(id) && id > 0 ? id : 1;
  }, [onboardBands]);
  const allocationEmployeesPickerFiltered = useMemo(() => {
    const q = allocationEmployeePickerQuery.trim().toLowerCase();
    if (!q) return allocationUsers;
    return allocationUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        Boolean(u.role && u.role.toLowerCase().includes(q))
    );
  }, [allocationUsers, allocationEmployeePickerQuery]);
  const allocationEmployeeSelectLabel = useMemo(() => {
    const email = allocationForm.employee_email.trim().toLowerCase();
    if (!email) return "Select employee";
    const hit = allocationUsers.find((u) => u.email.toLowerCase() === email);
    if (!hit) return allocationForm.employee_email.trim();
    return hit.role
      ? `${hit.name} | ${hit.role} (${hit.email})`
      : `${hit.name} (${hit.email})`;
  }, [allocationUsers, allocationForm.employee_email]);
  const assignedProjectsWithAllocationPct = useMemo(
    () =>
      assignedProjects.map((row) => ({
        ...row,
        allocated_hours: formatAllocatedHoursPercentLabel(
          row.allocated_hours ?? row.allocatedHours ?? row.hours
        ),
      })),
    [assignedProjects]
  );
  const profileAssignedProjectsForTable = useMemo(
    () =>
      profileAssignedProjects.map((row) => ({
        ...row,
        allocated_hours: formatAllocatedHoursPercentLabel(
          row.allocated_hours ?? row.allocatedHours ?? row.hours
        ),
      })),
    [profileAssignedProjects]
  );
  const utilizationBenchRowsWithInvestment = useMemo(() => {
    const seen = new Set(
      benchAgingRows.map((r) => String(r.email ?? "").trim().toLowerCase()).filter(Boolean)
    );
    const extras: Array<Record<string, unknown>> = [];
    for (const row of allocations) {
      if (String(row.billing_status ?? row.billingStatus ?? "").toUpperCase() !== "INVESTMENT") continue;
      const email = String(
        row.employee_email ?? row.email ?? row.user_email ?? row.userEmail ?? ""
      )
        .trim()
        .toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      extras.push({
        emp_id: String(row.emp_id ?? row.employee_id ?? row.employeeId ?? row.id ?? "—"),
        email,
        name: String(row.employee_name ?? row.name ?? "—"),
        department: String(row.department ?? row.role ?? row.designation ?? "—"),
        bench_days: "Investment allocation",
      });
    }
    return [...benchAgingRows, ...extras];
  }, [benchAgingRows, allocations]);  useEffect(() => {
    const code = allocationForm.project_code.trim();
    if (!code) return;
    const fromProjects = projects.find(
      (p) =>
        String(p.project_code ?? p.projectCode ?? "")
          .trim()
          .toLowerCase() === code.toLowerCase()
    );
    const fromAllocList = allocationProjects.find((p) => p.code.toLowerCase() === code.toLowerCase());
    const pt = String(
      fromProjects?.project_type ??
        fromProjects?.projectType ??
        fromAllocList?.project_type ??
        ""
    ).toUpperCase();
    if (pt === "PRODUCT") {
      setAllocationForm((prev) =>
        prev.billing_status === "INVESTMENT" ? prev : { ...prev, billing_status: "INVESTMENT" }
      );
    }
  }, [allocationForm.project_code, projects, allocationProjects]);
  useEffect(() => {
    if (!allocationEmployeePickerOpen) return;
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const root = allocationEmployeeComboboxRef.current;
      if (root && !root.contains(e.target as Node)) {
        setAllocationEmployeePickerOpen(false);
        setAllocationEmployeePickerQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [allocationEmployeePickerOpen]);
  useEffect(() => {
    const flex = designationAllowsFlexibleHours(allocationForm.role);
    const hrs = Number(allocationForm.allocated_hours);
    if (flex) {
      if (!Number.isFinite(hrs) || hrs < 1 || hrs > 8 || !Number.isInteger(hrs)) {
        setAllocationForm((p) => ({ ...p, allocated_hours: "8" }));
      }
    } else if (hrs !== 4 && hrs !== 8) {
      setAllocationForm((p) => ({ ...p, allocated_hours: "8" }));
    }
  }, [allocationForm.role, allocationForm.allocated_hours]);

  const offboardingNoticeLabel = useMemo(() => {
    const r = offboardingForm.resignation_date.trim();
    const l = offboardingForm.last_working_day.trim();
    if (!r || !l) return null;
    const a = new Date(r);
    const b = new Date(l);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) {
      return "Resignation date must be on or before last working day.";
    }
    const days = Math.round((b.getTime() - a.getTime()) / 86400000);
    return `Notice period (resignation → last working day): ${Math.max(0, days)} calendar day(s).`;
  }, [offboardingForm.resignation_date, offboardingForm.last_working_day]);
  const normalizeBandValue = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) return String(parsed);
    const digitMatch = raw.match(/\d+/);
    return digitMatch?.[0] ?? raw.toUpperCase();
  };
  const normalizeRoleToken = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/^role_/, "")
      .replace(/_/g, " ");
  const pickBandFromRecord = (record: Record<string, unknown>) => {
    const nestedBand = record.band_master as Record<string, unknown> | undefined;
    const nestedBandAlt = record.bandMaster as Record<string, unknown> | undefined;
    return normalizeBandValue(
      record.band_id ??
        record.bandId ??
        record.band ??
        record.band_name ??
        record.bandName ??
        nestedBand?.band_id ??
        nestedBand?.band ??
        nestedBandAlt?.band_id ??
        nestedBandAlt?.band
    );
  };
  const pickDesignationFromRecord = (record: Record<string, unknown>) =>
    String(
      record.designation ??
        record.designation_name ??
        record.designationName ??
        ""
    )
      .trim()
      .toLowerCase();
  const pickRoleTokensFromRecord = (record: Record<string, unknown>) =>
    new Set(
      [
        record.role,
        record.user_role,
        record.userRole,
        record.role_name,
        record.roleName,
      ]
        .map(normalizeRoleToken)
        .filter(Boolean)
    );
  const userBandId = useMemo(() => {
    return normalizeBandValue(
      employeeProfile?.band_id ??
        employeeProfile?.bandId ??
        employeeProfile?.band ??
        (employeeProfile?.band_master as Record<string, unknown> | undefined)?.band_id ??
        (employeeProfile?.bandMaster as Record<string, unknown> | undefined)?.band_id
    );
  }, [employeeProfile]);
  const userDesignation = useMemo(
    () =>
      String(
        employeeProfile?.designation ??
          employeeProfile?.designation_name ??
          employeeProfile?.designationName ??
          employeeProfile?.role ??
          ""
      )
        .trim()
        .toLowerCase(),
    [employeeProfile]
  );
  const userRoleTokens = useMemo(() => {
    const roleFromProfile = String(employeeProfile?.role ?? "").trim();
    const roleNameFromProfile = String(employeeProfile?.role_name ?? employeeProfile?.roleName ?? "").trim();
    const authRoles = (user?.roles ?? []).map((r) => String(r).trim());
    return new Set(
      [roleFromProfile, roleNameFromProfile, ...authRoles]
        .map(normalizeRoleToken)
        .filter(Boolean)
    );
  }, [employeeProfile, user?.roles]);
  const canViewAllKpis = useMemo(
    () => (user?.roles ?? []).some((r) => r === "ROLE_HR" || r === "ROLE_ADMIN"),
    [user?.roles]
  );
  const filteredKpis = useMemo(() => {
    if (!kpis.length) return [];
    if (canViewAllKpis) return kpis;
    const hasBandAwareRows = kpis.some((row) => Boolean(pickBandFromRecord(row)));
    const hasDesignationAwareRows = kpis.some((row) => Boolean(pickDesignationFromRecord(row)));
    const hasRoleAwareRows = kpis.some((row) => pickRoleTokensFromRecord(row).size > 0);

    if (hasBandAwareRows && !userBandId) return [];
    if (hasDesignationAwareRows && !userDesignation) return [];
    if (hasRoleAwareRows && userRoleTokens.size === 0) return [];

    return kpis.filter((row) => {
      const normalizedBand = pickBandFromRecord(row);
      const rowDesignation = pickDesignationFromRecord(row);
      const rowRoleTokens = pickRoleTokensFromRecord(row);

      const bandMatches = !hasBandAwareRows || normalizedBand === userBandId;
      const designationMatches =
        !hasDesignationAwareRows ||
        rowDesignation === userDesignation ||
        rowDesignation.includes(userDesignation) ||
        userDesignation.includes(rowDesignation);
      const roleMatches =
        !hasRoleAwareRows ||
        Array.from(rowRoleTokens).some((token) => userRoleTokens.has(token));

      return Boolean(bandMatches && designationMatches && roleMatches);
    });
  }, [kpis, canViewAllKpis, userBandId, userDesignation, userRoleTokens]);
  const loadTimelogsForCurrentRole = useCallback(async function loadTimelogsForCurrentRole(
    targetEmployeeEmail?: string
  ) {
    const parseManagerFlag = (value: unknown): boolean => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value === 1;
      const normalized = String(value ?? "").trim().toLowerCase();
      if (!normalized) return false;
      if (["true", "yes", "y", "1", "manager"].includes(normalized)) return true;
      if (["false", "no", "n", "0"].includes(normalized)) return false;
      return false;
    };

    let timelogRows: Array<Record<string, unknown>> = [];
    if (hasHrAccess) {
      const normalizedTarget = String(targetEmployeeEmail ?? "")
        .trim()
        .toLowerCase();
      if (normalizedTarget) {
        try {
          const focusedRes = await hrmsService.getTimelogs({
            page: "0",
            size: "200",
            view: "ALL",
            employee_email: normalizedTarget,
            employeeEmail: normalizedTarget,
          } as Record<string, string>);
          const focusedRows = toPagedRows((focusedRes as { data?: unknown }).data ?? focusedRes).filter((row) => {
            const email = String(
              row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
            )
              .trim()
              .toLowerCase();
            return email === normalizedTarget;
          });
          if (focusedRows.length) {
            setTimelogs(focusedRows);
            return focusedRows;
          }
        } catch {
          /* fall through to org-wide load */
        }
      }
      try {
        const hrView = await hrmsService.getTimelogs({ page: "0", size: "200", view: "ALL" });
        timelogRows = toPagedRows((hrView as { data?: unknown }).data ?? hrView);
      } catch {
        timelogRows = [];
      }
    }
    if (!timelogRows.length) {
      const fallback = await hrmsService.getTimelogs({ page: "0", size: "200" });
      timelogRows = toPagedRows((fallback as { data?: unknown }).data ?? fallback);
    }

    if (!hasHrAccess) {
      if (hasManagerAccess) {
        let teamRows: Array<Record<string, unknown>> = [];
        try {
          const loaded = await loadManagerData();
          teamRows = loaded.detailRows;
        } catch {
          teamRows = [];
        }
        const teamEmailToName: Record<string, string> = {};
        for (const row of teamRows) {
          const directEmail = String(
            row.employee_email ?? row.email ?? row.user_email ?? row.userEmail ?? ""
          )
            .trim()
            .toLowerCase();
          const directName = String(
            row.employee_name ?? row.employeeName ?? row.name ?? row.user_name ?? row.userName ?? ""
          ).trim();
          if (directEmail && directName) teamEmailToName[directEmail] = directName;
          const nestedEmployees = Array.isArray(row.employees)
            ? (row.employees as Array<Record<string, unknown>>)
            : [];
          for (const emp of nestedEmployees) {
            const email = String(emp.email ?? emp.user_email ?? emp.userEmail ?? "")
              .trim()
              .toLowerCase();
            const name = String(emp.name ?? emp.employee_name ?? emp.employeeName ?? "").trim();
            if (email && name) teamEmailToName[email] = name;
          }
        }
        const teamEmailSet = new Set(managerTeamEmails(teamRows));
        if (teamEmailSet.size) {
          const normalizedTarget = String(targetEmployeeEmail ?? "")
            .trim()
            .toLowerCase();
          if (normalizedTarget && teamEmailSet.has(normalizedTarget)) {
            const focusedRes = await hrmsService.getTimelogs({
              page: "0",
              size: "200",
              employee_email: normalizedTarget,
              employeeEmail: normalizedTarget,
            });
            const focusedRows = toPagedRows((focusedRes as { data?: unknown }).data ?? focusedRes).filter((row) => {
              const email = String(
                row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
              )
                .trim()
                .toLowerCase();
              return email === normalizedTarget;
            });
            if (focusedRows.length) {
              setManagerEmailsForHr([]);
              setTimelogs(focusedRows);
              return focusedRows;
            }
          }

          // Preferred path: query timelog endpoint by employee email (works in this backend).
          const directResponses = await Promise.allSettled(
            Array.from(teamEmailSet).map((email) =>
              hrmsService.getTimelogs({
                page: "0",
                size: "200",
                view: "ALL",
                employee_email: email,
                employeeEmail: email,
              } as Record<string, string>)
            )
          );
          const directRows = directResponses
            .filter(
              (
                item
              ): item is PromiseFulfilledResult<ApiEnvelope<PagedData<unknown>>> =>
                item.status === "fulfilled"
            )
            .flatMap((item) => toPagedRows((item.value as { data?: unknown }).data ?? item.value))
            .filter((row) => {
              const email = String(
                row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
              )
                .trim()
                .toLowerCase();
              return Boolean(email) && teamEmailSet.has(email);
            });

          if (directRows.length) {
            const dedupedDirectRows = Array.from(
              new Map(
                directRows.map((row) => {
                  const key = String(
                    row.timelog_id ??
                      row.timeLogId ??
                      row.id ??
                      `${row.employee_email ?? row.email}-${row.project_code}-${row.log_date}-${row.hours}`
                  );
                  const email = String(
                    row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
                  )
                    .trim()
                    .toLowerCase();
                  const resolvedName = String(
                    row.employee_name ?? row.employeeName ?? row.name ?? (email ? teamEmailToName[email] : "") ?? ""
                  ).trim();
                  return [key, { ...row, employee_name: resolvedName || "—" }] as const;
                })
              ).values()
            );
            setManagerEmailsForHr([]);
            setTimelogs(dedupedDirectRows);
            return dedupedDirectRows;
          }

          const today = new Date();
          const dates: string[] = [];
          // Wider fallback window so future planned logs are visible.
          for (let i = -30; i < 90; i += 1) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            dates.push(d.toISOString().slice(0, 10));
          }
          const legacyResponses = await Promise.allSettled(
            Array.from(teamEmailSet).flatMap((email) =>
              dates.map((logDate) =>
                apiClient.get(endpoints.timelog.legacyGetByDate(email, logDate), {
                  query: { page: "0", size: "200" },
                })
              )
            )
          );
          const teamTimelogRows = legacyResponses
            .filter(
              (
                item
              ): item is PromiseFulfilledResult<unknown> => item.status === "fulfilled"
            )
            .flatMap((item) => toPagedRows((item.value as { data?: unknown }).data ?? item.value));
          const merged = [...timelogRows, ...teamTimelogRows];
          const deduped = Array.from(
            new Map(
              merged.map((row) => {
                const key = String(
                  row.timelog_id ??
                    row.timeLogId ??
                    row.id ??
                    `${row.employee_email ?? row.email}-${row.project_code}-${row.log_date}-${row.hours}`
                );
                const email = String(
                  row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
                )
                  .trim()
                  .toLowerCase();
                const resolvedName = String(
                  row.employee_name ?? row.employeeName ?? row.name ?? (email ? teamEmailToName[email] : "") ?? ""
                ).trim();
                return [key, { ...row, employee_name: resolvedName || "—" }] as const;
              })
            ).values()
          );
          setManagerEmailsForHr([]);
          setTimelogs(deduped);
          return deduped;
        }
      }
      setManagerEmailsForHr([]);
      setTimelogs(timelogRows);
      return timelogRows;
    }

    let allocationRows: Array<Record<string, unknown>> = [];
    let onboardRows: Array<Record<string, unknown>> = [];
    try {
      const allocRes = await hrmsService.getAllocations({ page: "0", size: "200", view: "ALL" });
      allocationRows = toPagedRows((allocRes as { data?: unknown }).data ?? allocRes);
      if (!allocationRows.length) {
        const allocFallback = await hrmsService.getAllocations({ page: "0", size: "200" });
        allocationRows = toPagedRows((allocFallback as { data?: unknown }).data ?? allocFallback);
      }
    } catch {
      allocationRows = [];
    }
    try {
      const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "200" });
      onboardRows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
    } catch {
      onboardRows = [];
    }

    const managerEmailSet = new Set<string>();
    const onboardUserIdToEmail: Record<string, string> = {};
    const onboardEmailToName: Record<string, string> = {};
    for (const row of onboardRows) {
      const uid = String(
        row.user_id ?? row.userId ?? row.userID ?? row.id ?? row.emp_id ?? ""
      ).trim();
      const email = String(row.email ?? row.user_email ?? row.userEmail ?? "")
        .trim()
        .toLowerCase();
      const name = String(row.name ?? "").trim();
      if (uid && email) onboardUserIdToEmail[uid] = email;
      if (email && name) onboardEmailToName[email] = name;
    }
    for (const row of allocationRows) {
      const isManager =
        parseManagerFlag(row.is_manager) ||
        isManagerRoleLabel(row.role ?? row.designation);
      if (!isManager) continue;
      const email = String(
        row.employee_email ?? row.email ?? row.user_email ?? row.userEmail ?? ""
      )
        .trim()
        .toLowerCase();
      if (email) {
        managerEmailSet.add(email);
        continue;
      }
      const uid = String(row.user_id ?? row.userId ?? row.userID ?? row.id ?? "").trim();
      const mappedEmail = onboardUserIdToEmail[uid];
      if (mappedEmail) managerEmailSet.add(mappedEmail);
    }
    for (const row of onboardRows) {
      const isManager =
        isManagerRoleLabel(row.role ?? row.designation ?? row.department ?? row.name);
      if (!isManager) continue;
      const email = String(row.email ?? row.user_email ?? row.userEmail ?? "")
        .trim()
        .toLowerCase();
      if (email) managerEmailSet.add(email);
    }

    // /timelog returns own logs only in many environments; for HR, fallback to
    // legacy manager-email/date endpoint to collect manager timelogs.
    if (!timelogRows.length && managerEmailSet.size) {
      const today = new Date();
      const dates: string[] = [];
      // Include recent past plus a small forward window (future-dated entries can exist).
      for (let i = -3; i < 14; i += 1) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      const legacyResponses = await Promise.allSettled(
        Array.from(managerEmailSet).flatMap((email) =>
          dates.map((logDate) =>
            apiClient.get(endpoints.timelog.legacyGetByDate(email, logDate), {
              query: { page: "0", size: "200" },
            })
          )
        )
      );
      const legacyRows = legacyResponses
        .filter(
          (
            item
          ): item is PromiseFulfilledResult<unknown> => item.status === "fulfilled"
        )
        .flatMap((item) => toPagedRows((item.value as { data?: unknown }).data ?? item.value));
      if (legacyRows.length) {
        timelogRows = legacyRows;
      }
    }
    setManagerEmailsForHr(Array.from(managerEmailSet));

    const normalizedRows = timelogRows.map((row) => {
      const existingManagerFlag = parseManagerFlag(row.is_manager);
      const email = String(
        row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
      )
        .trim()
        .toLowerCase();
      const employeeName = String(
        row.employee_name ??
          row.employeeName ??
          row.name ??
          (email ? onboardEmailToName[email] : "") ??
          ""
      ).trim();
      if (existingManagerFlag) {
        return {
          ...row,
          employee_name: employeeName || "—",
        };
      }
      if (!email || !managerEmailSet.has(email)) {
        return {
          ...row,
          employee_name: employeeName || "—",
        };
      }
      return {
        ...row,
        is_manager: true,
        employee_name: employeeName || "—",
      };
    });
    setTimelogs(normalizedRows);
    return normalizedRows;
  }, [hasHrAccess, hasManagerAccess, loadManagerData]);
  const loadEmployeeRequestsForApprover = useCallback(
    async (scope: "team" | "org" = "team") => {
    const today = new Date();
    const future = new Date(today);
    future.setFullYear(future.getFullYear() + 2);
    const from = employeeRequestFilters.fromDate || `${today.getFullYear()}-01-01`;
    const to = employeeRequestFilters.toDate || future.toISOString().slice(0, 10);
    const requestType = employeeRequestFilters.requestType || "ALL";
    let onboardRows: Array<Record<string, unknown>> = [];
    let scopedManagerRows: Array<Record<string, unknown>> = [];
    if (scope === "team" && hasHrAccess) {
      const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "200" });
      onboardRows = toPagedRows(onboardRes.data ?? onboardRes);
    } else if (scope === "team" && hasManagerAccess) {
      if (managerPortfolioRows.length) {
        scopedManagerRows = managerPortfolioRows;
      } else {
        const loaded = await loadManagerData();
        scopedManagerRows = loaded.detailRows;
      }
    }
    const scopeRows = scope === "team" && hasHrAccess ? onboardRows : scopedManagerRows;
    const expandedScopeRows = scopeRows.flatMap((row) => {
      const nestedEmployees = Array.isArray(row.employees)
        ? (row.employees as Array<Record<string, unknown>>)
        : [];
      if (!nestedEmployees.length) return [row];
      return nestedEmployees.map((emp) => ({
        ...row,
        email: emp.email ?? emp.user_email ?? emp.userEmail ?? row.email,
        user_email: emp.email ?? emp.user_email ?? emp.userEmail ?? row.user_email,
        name: emp.name ?? emp.employee_name ?? emp.employeeName ?? row.name,
        employee_name: emp.name ?? emp.employee_name ?? emp.employeeName ?? row.employee_name,
        user_id: emp.user_id ?? emp.userId ?? emp.emp_id ?? row.user_id,
        emp_id: emp.emp_id ?? emp.user_id ?? row.emp_id,
      }));
    });
    const idToName = buildUserIdToNameMap(expandedScopeRows);
    const emailToName = buildEmailToNameMap(expandedScopeRows);
    const userIdToEmail: Record<string, string> = {};
    for (const row of expandedScopeRows) {
      const uid = String(row.user_id ?? row.userId ?? row.userID ?? row.id ?? row.emp_id ?? "").trim();
      const email = String(
        row.email ?? row.user_email ?? row.userEmail ?? row.employee_email ?? row.employeeEmail ?? ""
      )
        .trim()
        .toLowerCase();
      if (uid && email) userIdToEmail[uid] = email;
    }
    const emailCsv = expandedScopeRows
      .map((r) =>
        String(
          r.email ?? r.user_email ?? r.userEmail ?? r.employee_email ?? r.employeeEmail ?? ""
        ).trim()
      )
      .filter(Boolean)
      .join(",");
    const collectedRows: Array<Record<string, unknown>> = [];
    if (scope === "team") {
      if (emailCsv) {
        collectedRows.push(
          ...(await listScopedUserRequests({
            fromDate: from,
            toDate: to,
            requestType,
            empEmails: emailCsv,
          }))
        );
      }
      if (hasDmAccess && !hasHrAccess) {
        collectedRows.push(
          ...(await listScopedUserRequests({
            fromDate: from,
            toDate: to,
            requestType,
          }))
        );
      }
    } else if (hasHrAccess) {
      collectedRows.push(
        ...(await listScopedUserRequests({
          fromDate: from,
          toDate: to,
          requestType,
        }))
      );
    }
    let rows = collectedRows;
    rows = Array.from(
      new Map(
        rows.map((row) => {
          const key = String(
            row.user_request_id ?? row.userRequestId ?? row.request_id ?? row.requestId ?? row.id ?? Math.random()
          );
          return [key, row] as const;
        })
      ).values()
    );
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
  },
    [employeeRequestFilters, hasHrAccess, hasManagerAccess, hasDmAccess, managerPortfolioRows, loadManagerData]
  );

  useEffect(() => {
    if (leaveSubTab !== "team" && leaveSubTab !== "org") return;
    if (!canViewTeamLeave) return;
    if (leaveSubTab === "org" && !hasHrAccess) return;
    const scope = leaveSubTab === "org" ? "org" : "team";
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          await loadEmployeeRequestsForApprover(scope);
        } catch {
          setEmployeeRequests([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [leaveSubTab, canViewTeamLeave, hasHrAccess, loadEmployeeRequestsForApprover]);

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
    await loadEmployeeRequestsForApprover(leaveSubTab === "org" ? "org" : "team");
  }
  const loadInviteOnboardingPreview = useCallback(
    async (range?: { from?: string; to?: string }) => {
      const from = (range?.from ?? invitedListFromDateRef.current).trim();
      const to = (range?.to ?? invitedListToDateRef.current).trim();
      if (!from || !to) {
        throw new Error("From date and To date are required.");
      }
      if (from > to) {
        throw new Error("From date must be on or before To date.");
      }

      const res = await hrmsService.getInvitedUsers({
        fromDate: from,
        toDate: to,
        page: "0",
        size: "200",
      });
      const payload = ((res as { data?: unknown }).data ?? res) as Record<string, unknown>;
      const respFrom = String(payload.from_date ?? "").trim().slice(0, 10);
      const respTo = String(payload.to_date ?? "").trim().slice(0, 10);
      const rawRows = toPagedRows(payload.items ?? payload);
      const filteredRows = filterInvitedRowsByCreatedAtRange(rawRows, from, to);
      const serverRangeMismatch =
        Boolean(respFrom && respTo) && (respFrom !== from || respTo !== to);
      setInvitedApiServerRange(
        serverRangeMismatch ? { from: respFrom, to: respTo } : null
      );
      setInviteOnboardingRows(formatInvitedEmployeeTableRows(filteredRows));
    },
    []
  );

  const loadAllocationsForHr = useCallback(async () => {
    let rows: Array<Record<string, unknown>> = [];
    try {
      rows = await hrmsService.fetchAllActiveNonBenchAllocations(200);
    } catch {
      rows = [];
    }
    if (!rows.length) {
      const res = await hrmsService.getAllocations({ page: "0", size: "200", view: "ALL" });
      const primary = (res as { data?: unknown }).data ?? res;
      rows = toPagedRows(primary);
      if (!rows.length) {
        const fallback = await hrmsService.getAllocations({ page: "0", size: "200" });
        const fbPayload = (fallback as { data?: unknown }).data ?? fallback;
        rows = toPagedRows(fbPayload);
      }
    }

    let onboardUsers: Array<Record<string, unknown>> = [];
    let projectRows: Array<Record<string, unknown>> = [];
    await Promise.all([
      (async () => {
        try {
          const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "500" });
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
  useEffect(() => {
    if (!hasHrAccess) return;
    if (requiresSelfOnboarding) return;
    const id = window.setTimeout(() => {
      void loadAllocationsForHr().catch(() => {
        setAllocations([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [hasHrAccess, requiresSelfOnboarding, loadAllocationsForHr]);
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
  const normalizedManagerProjects = useMemo(() => {
    const sourceRows = managerProjects.length ? managerProjects : managerPortfolioRows;
    return Array.from(
      new Map(
        sourceRows
          .map((row) => {
            const code = managerProjectCode(row);
            if (!code) return null;
            const name = managerProjectName(row) || code;
            const type = String(row.project_type ?? row.projectType ?? "—").trim();
            return [code.toLowerCase(), { project_code: code, project_name: name, project_type: type }] as const;
          })
          .filter(
            (value): value is readonly [string, { project_code: string; project_name: string; project_type: string }] =>
              Boolean(value)
          )
      ).values()
    );
  }, [managerProjects, managerPortfolioRows]);
  const managerProjectTeamRows = useMemo(() => {
    // Source-of-truth for "who is allocated to this project" is allocations.
    // Some manager endpoints only return the manager row (not full team), so allocations are safer.
    const source = managerProjectAllocations.length ? managerProjectAllocations : managerPortfolioRows;
    return managerTeamRowsForProject(source, selectedManagerProjectCode);
  }, [managerProjectAllocations, managerPortfolioRows, selectedManagerProjectCode]);
  const managerTeamEmailList = useMemo(
    () => managerTeamEmails(managerPortfolioRows),
    [managerPortfolioRows]
  );
  const teamTimelogEmployeeOptions = useMemo(() => {
    if (hasHrAccess && hrTimelogDirectoryEmails.length) return hrTimelogDirectoryEmails;
    return managerTeamEmailList;
  }, [hasHrAccess, hrTimelogDirectoryEmails, managerTeamEmailList]);
  const managerTeamTimelogs = useMemo(() => {
    const normalizedFilter = teamTimelogEmailFilter.trim().toLowerCase();
    if (normalizedFilter && normalizedFilter !== "all") {
      return timelogs.filter((row) => {
        const email = String(
          row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
        )
          .trim()
          .toLowerCase();
        return Boolean(email) && email === normalizedFilter;
      });
    }
    if (hasHrAccess) {
      return timelogs;
    }
    if (!managerTeamEmailList.length) return timelogs;
    const teamEmailSet = new Set(managerTeamEmailList);
    return timelogs.filter((row) => {
      const email = String(
        row.employee_email ?? row.user_email ?? row.userEmail ?? row.email ?? ""
      )
        .trim()
        .toLowerCase();
      return Boolean(email) && teamEmailSet.has(email);
    });
  }, [timelogs, managerTeamEmailList, teamTimelogEmailFilter, hasHrAccess]);  useEffect(() => {
    if (teamTimelogEmailFilter === "ALL") return;
    const exists = teamTimelogEmployeeOptions.some(
      (email) => email.toLowerCase() === teamTimelogEmailFilter.trim().toLowerCase()
    );
    if (!exists) {
      setTeamTimelogEmailFilter("ALL");
    }
  }, [teamTimelogEmployeeOptions, teamTimelogEmailFilter]);  useEffect(() => {
    if (timelogSubTab !== "team") return;
    const selected = teamTimelogEmailFilter.trim();
    if (!selected || selected.toUpperCase() === "ALL") return;
    void loadTimelogsForCurrentRole(selected).catch(() => {
      /* ignore focused refresh errors */
    });
  }, [timelogSubTab, teamTimelogEmailFilter, loadTimelogsForCurrentRole]);
  // (learning loaders moved above useEffects to avoid TDZ)
  const loadWorkforceOverviewReports = useCallback(async () => {
    const params = {
      page: 0,
      size: 10,
      search: undefined,
    };
    const [headcountRes, billingRes, expRes] = await Promise.all([
      hrmsService.getWorkforceHeadcountDistribution(params),
      hrmsService.getWorkforceRoleBilling(params),
      hrmsService.getWorkforceExperienceBands(params),
    ]);
    const headcountPayload = ((headcountRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const billingPayload = ((billingRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const expPayload = ((expRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    setHeadcountBreakdown(
      toRows(headcountPayload.data ?? (headcountPayload as { data?: unknown }).data).map((row) => ({
        ...row,
        billing_type: row.billing_type ?? row.billingType ?? row.department_type ?? row.departmentType ?? "—",
      }))
    );
    setRoleBillingRows(toRows(billingPayload.data ?? (billingPayload as { data?: unknown }).data));
    setExperienceBandRows(toRows(expPayload.data ?? (expPayload as { data?: unknown }).data));
  }, []);
  const loadUtilizationReports = useCallback(async () => {
    const parsedPage = Number.parseInt(utilizationFilters.page, 10);
    const parsedSize = Number.parseInt(utilizationFilters.size, 10);
    const params = {
      page: Number.isFinite(parsedPage) && parsedPage >= 0 ? parsedPage : 0,
      size: Number.isFinite(parsedSize) && parsedSize > 0 ? Math.min(parsedSize, 500) : 10,
      search: utilizationFilters.search.trim() || undefined,
      as_of: utilizationFilters.as_of.trim() || undefined,
    };
    const [utilizationRes, benchRes] = await Promise.all([
      hrmsService.getUtilizationByDepartment(params),
      hrmsService.getBenchAging(params),
    ]);
    const utilizationPayload = ((utilizationRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const benchPayload = ((benchRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    setUtilizationByDepartmentRows(toRows(utilizationPayload.data ?? (utilizationPayload as { data?: unknown }).data));
    setBenchAgingRows(toRows(benchPayload.data ?? (benchPayload as { data?: unknown }).data));
  }, [utilizationFilters.as_of, utilizationFilters.page, utilizationFilters.search, utilizationFilters.size]);
  const loadAttritionReports = useCallback(async () => {
    const parsedFy = Number.parseInt(attritionFyStartYear, 10);
    const fy_start_year =
      Number.isFinite(parsedFy) && parsedFy >= 2000 && parsedFy <= 2100 ? parsedFy : new Date().getFullYear();
    const params = { fy_start_year };
    const [overallRes, viRes, roleRes, managerRes, skillRes, regrettedRes, tenureRes] = await Promise.all([
      hrmsService.getAttritionOverallPercent(params),
      hrmsService.getAttritionVoluntaryInvoluntary(params),
      hrmsService.getAttritionRoleWise(params),
      hrmsService.getAttritionManagerWise(params),
      hrmsService.getAttritionCriticalSkill(params),
      hrmsService.getAttritionRegretted(params),
      hrmsService.getAttritionAverageTenure(params),
    ]);
    const overallPayload = ((overallRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const viPayload = ((viRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const rolePayload = ((roleRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const managerPayload = ((managerRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const skillPayload = ((skillRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const regrettedPayload = ((regrettedRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const tenurePayload = ((tenureRes as { data?: unknown }).data ?? {}) as Record<string, unknown>;

    setAttritionOverallRows([{
      fy_start_year: overallPayload.fy_start_year ?? fy_start_year,
      fy_april_start: overallPayload.fy_april_start ?? "—",
      fy_march_end: overallPayload.fy_march_end ?? "—",
      number_of_exits: overallPayload.number_of_exits ?? 0,
      attrition_percent: overallPayload.attrition_percent ?? 0,
    }]);
    setAttritionVoluntaryRows([{
      voluntary_count: viPayload.voluntary_count ?? 0,
      involuntary_count: viPayload.involuntary_count ?? 0,
      total_count: viPayload.total_count ?? 0,
    }]);
    setAttritionRoleWiseRows(toRows(rolePayload.rows ?? rolePayload.data));
    setAttritionManagerWiseRows(toRows(managerPayload.rows ?? managerPayload.data));
    setAttritionCriticalSkillRows(toRows(skillPayload.rows ?? skillPayload.data));
    setAttritionRegrettedRows([{
      total_regretted_exits: regrettedPayload.total_regretted_exits ?? 0,
      percent_of_total_attrition: regrettedPayload.percent_of_total_attrition ?? 0,
    }]);
    setAttritionAverageTenureBuckets(toRows(tenurePayload.buckets ?? tenurePayload.data));
    setAttritionAverageTenureSummaryRows([{
      average_tenure_days: tenurePayload.average_tenure_days ?? 0,
      tenure_unknown_employees: tenurePayload.tenure_unknown_employees ?? 0,
    }]);
  }, [attritionFyStartYear]);
  const loadSkillInventoryReport = useCallback(async () => {
    const res = await hrmsService.getSkillInventory({ page: 0, size: 10 });
    const payload = ((res as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const rows = toRows(payload.data ?? payload).map((row) => {
      const primarySkillsRaw = row.primary_skills ?? row.primarySkills;
      const secondarySkillsRaw = row.secondary_skills ?? row.secondarySkills;
      const certsRaw = row.certifications ?? row.certs;
      const primarySkills = Array.isArray(primarySkillsRaw)
        ? primarySkillsRaw.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ")
        : String(primarySkillsRaw ?? "—").trim() || "—";
      const secondarySkills = Array.isArray(secondarySkillsRaw)
        ? secondarySkillsRaw
            .map((item) => {
              if (item && typeof item === "object") {
                const rec = item as Record<string, unknown>;
                const skill = String(rec.skill ?? rec.name ?? "").trim();
                const rating = rec.rating ?? rec.level;
                return skill ? `${skill}${rating !== undefined ? ` (${String(rating)})` : ""}` : "";
              }
              return String(item ?? "").trim();
            })
            .filter(Boolean)
            .join(", ")
        : String(secondarySkillsRaw ?? "—").trim() || "—";
      const certifications = Array.isArray(certsRaw)
        ? certsRaw.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ")
        : String(certsRaw ?? "—").trim() || "—";
      return {
        emp_id: row.emp_id ?? row.empId ?? "—",
        email: row.email ?? "—",
        name: row.name ?? "—",
        department: row.department ?? "—",
        role: row.role ?? row.designation ?? "—",
        primary_skills: primarySkills || "—",
        secondary_skills: secondarySkills || "—",
        certifications: certifications || "—",
      };
    });
    setSkillInventoryRows(rows);
  }, []);
  const loadContractDistributionReport = useCallback(async () => {
    const res = await hrmsService.getContractDistribution({ page: 0, size: 10 });
    const payload = ((res as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const rows = toRows(payload.data ?? payload).map((row) => ({
      employment_type: row.employment_type ?? row.employmentType ?? "—",
      count: row.count ?? 0,
      workforce_percent: row.workforce_percent ?? row.workforcePercent ?? 0,
    }));
    setContractDistributionRows(rows);
  }, []);
  const loadBgvDashboardReport = useCallback(async () => {
    const params = {
      page: 0,
      size: 10,
      search: bgvReportSearch.trim() || undefined,
      overall_status:
        bgvReportStatusFilter !== "ALL" ? bgvReportStatusFilter.trim().toUpperCase() : undefined,
      employment_status:
        bgvReportEmploymentFilter !== "ALL"
          ? bgvReportEmploymentFilter.trim().toUpperCase()
          : undefined,
      reference_status:
        bgvReportReferenceFilter !== "ALL"
          ? bgvReportReferenceFilter.trim().toUpperCase()
          : undefined,
    };
    const res = await hrmsService.getBgvDashboard(params);
    const payload = ((res as { data?: unknown }).data ?? {}) as Record<string, unknown>;
    const rows = toRows(payload.data ?? (payload as { data?: unknown }).data).map((row) => ({
      employee: row.employee ?? row.name ?? "—",
      role: row.role ?? "—",
      consent: row.consent ?? false,
      identity: row.identity ?? "—",
      employment: row.employment ?? "—",
      overall_status: row.overall_status ?? "—",
    }));
    setBgvDashboardRows(rows);
  }, [bgvReportEmploymentFilter, bgvReportReferenceFilter, bgvReportSearch, bgvReportStatusFilter]);  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadWorkforceOverviewReports().catch(() => {
        setHeadcountBreakdown([]);
        setRoleBillingRows([]);
        setExperienceBandRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [hasHrAccess, loadWorkforceOverviewReports]);  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadUtilizationReports().catch(() => {
        setUtilizationByDepartmentRows([]);
        setBenchAgingRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [hasHrAccess, loadUtilizationReports]);  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadAttritionReports().catch(() => {
        setAttritionOverallRows([]);
        setAttritionVoluntaryRows([]);
        setAttritionRoleWiseRows([]);
        setAttritionManagerWiseRows([]);
        setAttritionCriticalSkillRows([]);
        setAttritionRegrettedRows([]);
        setAttritionAverageTenureBuckets([]);
        setAttritionAverageTenureSummaryRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [hasHrAccess, loadAttritionReports]);  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadSkillInventoryReport().catch(() => {
        setSkillInventoryRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [hasHrAccess, loadSkillInventoryReport]);  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadContractDistributionReport().catch(() => {
        setContractDistributionRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [hasHrAccess, loadContractDistributionReport]);  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadBgvDashboardReport().catch(() => {
        setBgvDashboardRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [hasHrAccess, loadBgvDashboardReport]);  useEffect(() => {
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getOnboardList({ page: "0", size: "200" });
          const rows = toPagedRows((res as { data?: unknown }).data ?? res);
          const users = Array.from(
            new Map(
              rows
                .map((row) => {
                  const emp_id = String(row.emp_id ?? row.empId ?? "").trim();
                  if (!emp_id) return null;
                  const name = String(row.name ?? "—").trim() || "—";
                  const email = String(row.email ?? "—").trim() || "—";
                  return [emp_id.toLowerCase(), { emp_id, name, email }] as const;
                })
                .filter((entry): entry is readonly [string, { emp_id: string; name: string; email: string }] => Boolean(entry))
            ).values()
          ).sort((a, b) => a.emp_id.localeCompare(b.emp_id));
          setOffboardingUsers(users);
          const bgvRows = Array.from(
            new Map(
              rows
                .map((row) => {
                  const emp_id = String(row.emp_id ?? row.empId ?? "").trim();
                  if (!emp_id) return null;
                  return [
                    emp_id.toLowerCase(),
                    {
                      emp_id,
                      name: String(row.name ?? "—").trim() || "—",
                      email: String(row.email ?? "—").trim() || "—",
                      role: String(row.role ?? row.designation ?? row.band_role ?? "—").trim() || "—",
                      level: String(row.band_name ?? row.band ?? row.band_id ?? "—").trim() || "—",
                    },
                  ] as const;
                })
                .filter(
                  (
                    entry
                  ): entry is readonly [
                    string,
                    { emp_id: string; name: string; email: string; role: string; level: string },
                  ] => Boolean(entry)
                )
            ).values()
          ).sort((a, b) => a.emp_id.localeCompare(b.emp_id));
          setBgvUsers(bgvRows);

        } catch {
          setOffboardingUsers([]);
          setBgvUsers([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [hasHrAccess]);  useEffect(() => {
    const empId = bgvForm.emp_id.trim();
    if (!empId) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hrmsService.getBgvRecord(empId);
          const payload = ((res as { data?: unknown }).data ?? {}) as Record<string, unknown>;
          const row = ((payload.data ?? payload) ?? {}) as Record<string, unknown>;
          if (!row || typeof row !== "object") return;
          setBgvForm((prev) => ({
            ...prev,
            consent_form_signed: Boolean(row.consent_form_signed) ? "YES" : "NO",
            identity: String(row.identity ?? prev.identity ?? "").trim(),
            employment: String(row.employment_status ?? prev.employment ?? "N/A").trim() || "N/A",
            reference: String(row.reference_status ?? prev.reference ?? "N/A").trim() || "N/A",
            mail_id: String(row.mail_id ?? row.mail_id_verified ?? prev.mail_id ?? "").trim(),
            onboarding_form:
              String(row.onboarding_form_status ?? prev.onboarding_form ?? "PENDING").trim() || "PENDING",
            overall_status:
              String(row.overall_status ?? prev.overall_status ?? "IN_PROGRESS").trim() || "IN_PROGRESS",
            remarks: String(row.remarks ?? prev.remarks ?? "").trim(),
          }));
          setBgvRecords([{
            id: row.employee_id ?? row.emp_id ?? empId,
            name: row.name ?? bgvForm.name ?? "—",
            role: row.role ?? "—",
            level: row.level ?? "—",
            consent_form_signed: Boolean(row.consent_form_signed) ? "YES" : "NO",
            identity: row.identity ?? "—",
            employment: row.employment_status ?? "—",
            reference: row.reference_status ?? "—",
            mail_id: row.mail_id ?? row.mail_id_verified ?? "—",
            onboarding_form: row.onboarding_form_status ?? "—",
            overall_status: row.overall_status ?? "—",
            remarks: row.remarks ?? "",
          }]);
        } catch {
          setBgvRecords([]);
        }
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [hasHrAccess, bgvForm.emp_id]);  useEffect(() => {
    if (!normalizedManagerProjects.length) {
      setSelectedManagerProjectCode("");
      return;
    }
    const exists = normalizedManagerProjects.some(
      (row) => String(row.project_code).trim().toLowerCase() === selectedManagerProjectCode.trim().toLowerCase()
    );
    if (!exists) {
      setSelectedManagerProjectCode(String(normalizedManagerProjects[0].project_code ?? ""));
    }
  }, [normalizedManagerProjects, selectedManagerProjectCode]);  useEffect(() => {
    if (!hasHrAccess) return;
  }, [hasHrAccess]);
  const renderSelfOnboardingPanel = () => (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
      <h3 className="font-semibold mb-1">Complete Your Onboarding</h3>
      <p className="text-sm text-wt-text-muted mb-4">
        Employees must complete onboarding before full portal access. Your legal name and phone here replace what HR
        entered when you were invited.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <InputField
          label="Full name (as per ID)"
          value={selfOnboardForm.full_name}
          onChange={(v) => setSelfOnboardForm((p) => ({ ...p, full_name: v }))}
        />
        <InputField
          label="Phone number"
          value={selfOnboardForm.phone_number}
          onChange={(v) => setSelfOnboardForm((p) => ({ ...p, phone_number: v }))}
        />
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
            Relieving letter and a payslip are required when years of experience is greater than zero.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FileField
              label="Relieving letter (previous company)"
              accept=".pdf,image/*"
              onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, reliving_letter: file }))}
            />
            <FileField
              label="Upload last 3 months's payslip"
              accept=".pdf,image/*"
              onPick={(file) => setSelfOnboardFiles((p) => ({ ...p, salary_slips: file }))}
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-wt-text-muted">
          If your years of experience is above zero, add relieving letter and upload last 3 months&apos;s payslip (field appears when YoE &gt; 0).
        </p>
      )}
      <div className="mt-4">
        <Button variant="brand" type="button" className="px-3 py-2" onClick={() =>
            runAction("Submit onboarding", async () => {
              if (!user?.email) {
                throw new Error("Unable to resolve logged-in email.");
              }
              const legalName = selfOnboardForm.full_name.trim();
              const phone = selfOnboardForm.phone_number.trim();
              if (!legalName || !isValidPersonName(legalName)) {
                throw new Error("Enter your full name as per ID (letters and spaces, 2–120 characters).");
              }
              if (!phone || !isValidIndiaMobile(phone)) {
                throw new Error("Enter a valid Indian mobile number (10 digits, optional +91).");
              }
              const fd = new FormData();
              const primarySkills = selfOnboardForm.primary_skills
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              if (!primarySkills.length) {
                throw new Error("Please add at least one primary skill.");
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
                if (!selfOnboardFiles.salary_slips) {
                  throw new Error("Please upload a payslip file in the payslip field.");
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
              const yoeValue = selfOnboardForm.yoe ? Number(selfOnboardForm.yoe) : null;
              fd.append(
                "user_data",
                JSON.stringify({
                  email: user.email,
                  name: legalName,
                  phone_number: phone,
                  yoe: yoeValue,
                  experience: yoeValue && yoeValue > 0 ? `${yoeValue} years` : null,
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
                  if (file) fd.append("salary_slips[]", file as File);
                  return;
                }
                if (!file) return;
                fd.append(key, file as File);
              });
              await hrmsService.completeMyOnboarding(fd);
              setSelfOnboardForm({
                full_name: "",
                phone_number: "",
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
                salary_slips: null,
              });
              setIsSelfOnboarded(true);
              await refreshSession();
              await loadMyProfile();
              router.replace("/dashboard", { scroll: false });
              router.replace("/dashboard/overview", { scroll: false });
            })
          }
          disabled={actionLoading}
        >
          Submit Onboarding Form
        </Button>
      </div>
    </div>
  );

  const openOwnProfileEditor = () => {
    const profile = employeeProfile ?? {};
    const primarySkillsRaw = profile.primary_skills ?? profile.primarySkills ?? [];
    const primarySkills = Array.isArray(primarySkillsRaw)
      ? primarySkillsRaw.map((item) => String(item).trim()).filter(Boolean).join(", ")
      : String(primarySkillsRaw ?? "").trim();
    const secondarySkillsRaw =
      (profile.secondary_skills as Array<Record<string, unknown>> | undefined) ??
      (profile.secondarySkills as Array<Record<string, unknown>> | undefined) ??
      [];
    const firstSecondary = Array.isArray(secondarySkillsRaw) ? secondarySkillsRaw[0] : undefined;

    setSelfProfileForm({
      phone_number: String(profile.phone_number ?? profile.phoneNumber ?? "").trim(),
      primary_skills: primarySkills,
      secondary_skill: String(firstSecondary?.skill ?? "").trim(),
      secondary_rating: String(firstSecondary?.rating ?? "3"),
      yoe: String(profile.yoe ?? "").trim(),
    });
    setSelfProfileEmploymentFiles({
      reliving_letter: null,
      salary_slips: null,
    });
    setSelfProfilePic(null);
    setIsEditingOwnProfile(true);
  };

  const profileAssignedProjectColumns = employeeSelfServeProfile
    ? ["project_name", "project_code", "role", "allocated_hours", "start_date"]
    : [
        "project_name",
        "project_code",
        "role",
        "allocated_hours",
        "billing_status",
        "start_date",
        "end_date",
      ];

  const renderProfileAssignedProjectsSection = () => (
    <div className="mt-8 border-t border-wt-border pt-6">
      <h4 className="text-sm font-semibold mb-3">Assigned Projects</h4>
      {profileAssignedProjectsLoading ? (
        <SectionLoading label="Loading assigned projects…" />
      ) : (
        <DataTable
          columns={profileAssignedProjectColumns}
          rows={profileAssignedProjectsForTable}
          emptyLabel="No projects assigned."
          compact
        />
      )}
    </div>
  );

  const renderProfileDetailsGrid = () => (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
      <ProfileField label="Name" value={employeeProfile?.name ?? user?.name} />
      <ProfileField label="Email" value={employeeProfile?.email ?? user?.email} />
      <ProfileField label="Status" value={employeeProfile?.status ?? user?.status} />
      <ProfileField label="Phone Number" value={employeeProfile?.phone_number ?? employeeProfile?.phoneNumber} />
      <ProfileField
        label="Primary Skills"
        value={
          Array.isArray(employeeProfile?.primary_skills)
            ? (employeeProfile?.primary_skills as Array<unknown>).map((s) => String(s)).join(", ")
            : employeeProfile?.primary_skills
        }
      />
      <ProfileField
        label="Secondary Skills"
        value={formatSecondarySkillsForProfile(employeeProfile)}
        fullWidth
      />
      <ProfileField label="Years of Experience" value={employeeProfile?.yoe} />
    </dl>
  );

  const renderMyProfileViewPanel = () => (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-7 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-5">
          <ProfilePhotoAvatar profile={employeeProfile} fallbackName={user?.name} />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold mb-1">My Profile</h3>
            <p className="text-sm text-wt-text-muted">Review your profile details before editing.</p>
          </div>
        </div>
        <Button variant="brand" type="button" className="px-4 py-2.5" onClick={openOwnProfileEditor} disabled={actionLoading} >
          Edit Profile
        </Button>
      </div>
      {renderProfileDetailsGrid()}
      {renderProfileAssignedProjectsSection()}
    </div>
  );

  const renderEditMyProfilePanel = () => (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-7 md:p-8">
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
            Relieving letter and a payslip are required when years of experience is greater than zero.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FileField
              label="Relieving letter (previous company)"
              accept=".pdf,image/*"
              onPick={(file) => setSelfProfileEmploymentFiles((p) => ({ ...p, reliving_letter: file }))}
            />
            <FileField
              label="Upload last 3 months's payslip"
              accept=".pdf,image/*"
              onPick={(file) =>
                setSelfProfileEmploymentFiles((p) => ({ ...p, salary_slips: file }))
              }
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-wt-text-muted">
          If your years of experience is above zero, add relieving letter and upload last 3 months&apos;s payslip (field appears when YoE &gt; 0).
        </p>
      )}
      <div className="mt-3">
        <FileField label="Profile Picture (optional)" accept="image/*" onPick={setSelfProfilePic} />
      </div>
      <div className="mt-4">
        <Button variant="brand" type="button" className="px-3 py-2" onClick={() =>
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
                if (!selfProfileEmploymentFiles.salary_slips) {
                  throw new Error("Please upload a payslip file in the payslip field.");
                }
              }
              const employmentFilesFlat: Array<[string, File]> = [];
              if (selfProfileEmploymentFiles.reliving_letter) {
                employmentFilesFlat.push([
                  "reliving letter",
                  selfProfileEmploymentFiles.reliving_letter,
                ]);
              }
              if (selfProfileEmploymentFiles.salary_slips) {
                employmentFilesFlat.push([
                  "payslip",
                  selfProfileEmploymentFiles.salary_slips,
                ]);
              }
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
              const yoeValue = selfProfileForm.yoe ? Number(selfProfileForm.yoe) : null;
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
                  experience: yoeValue && yoeValue > 0 ? `${yoeValue} years` : null,
                  yoe: yoeValue,
                })
              );
              if (selfProfilePic) {
                fd.append("profilePic", selfProfilePic);
              }
              if (selfProfileEmploymentFiles.reliving_letter) {
                fd.append("reliving_letter", selfProfileEmploymentFiles.reliving_letter);
              }
              if (selfProfileEmploymentFiles.salary_slips) {
                fd.append("salary_slips[]", selfProfileEmploymentFiles.salary_slips);
              }
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
                salary_slips: null,
              });
              setSelfProfilePic(null);
              setIsEditingOwnProfile(false);
              await loadMyProfile();
            })
          }
          disabled={actionLoading}
        >
          Save Profile Changes
        </Button>
        <Button variant="ghost" type="button" className="ml-2 px-3 py-2" onClick={() => setIsEditingOwnProfile(false)}
          disabled={actionLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );


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

  return (
    <>
      <DashboardPageShell>
        <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
          <section className="space-y-4">
                          {showLeaveSubTabBar ? (
                            <div className="flex flex-wrap gap-2 border-b border-wt-border pb-3">
                              {isTeamLeaveRoute ? (
                                <>
                                  {canViewTeamLeave ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setLeaveSubTab("team")}
                                      className={`rounded-lg px-3 py-2 ${
                                        leaveSubTab === "team"
                                          ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text"
                                          : "text-wt-text-muted hover:bg-wt-surface-2"
                                      }`}
                                    >
                                      Team Requests
                                    </Button>
                                  ) : null}
                                  {hasHrAccess ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setLeaveSubTab("org")}
                                      className={`rounded-lg px-3 py-2 ${
                                        leaveSubTab === "org"
                                          ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text"
                                          : "text-wt-text-muted hover:bg-wt-surface-2"
                                      }`}
                                    >
                                      All Employee Requests
                                    </Button>
                                  ) : null}
                                  {showCompOffTab ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setLeaveSubTab("comp-off")}
                                      className={`rounded-lg px-3 py-2 ${
                                        leaveSubTab === "comp-off"
                                          ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text"
                                          : "text-wt-text-muted hover:bg-wt-surface-2"
                                      }`}
                                    >
                                      Comp Off Credit
                                    </Button>
                                  ) : null}
                                  {hasHrAccess ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setLeaveSubTab("balances")}
                                      className={`rounded-lg px-3 py-2 ${
                                        leaveSubTab === "balances"
                                          ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text"
                                          : "text-wt-text-muted hover:bg-wt-surface-2"
                                      }`}
                                    >
                                      Balances
                                    </Button>
                                  ) : null}
                                </>
                              ) : (
                                <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setLeaveSubTab("my")}
                                className={`rounded-lg px-3 py-2 ${
                                  leaveSubTab === "my"
                                    ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text"
                                    : "text-wt-text-muted hover:bg-wt-surface-2"
                                }`}
                              >
                                Leave Requests
                              </Button>
                              {showCompOffTab ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setLeaveSubTab("comp-off")}
                                  className={`rounded-lg px-3 py-2 ${
                                    leaveSubTab === "comp-off"
                                      ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text"
                                      : "text-wt-text-muted hover:bg-wt-surface-2"
                                  }`}
                                >
                                  Comp Off Credit
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setLeaveSubTab("wfh")}
                                className={`rounded-lg px-3 py-2 ${
                                  leaveSubTab === "wfh"
                                    ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text"
                                    : "text-wt-text-muted hover:bg-wt-surface-2"
                                }`}
                              >
                                WFH
                              </Button>
                              {hasHrAccess ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setLeaveSubTab("balances")}
                                  className={`rounded-lg px-3 py-2 ${
                                    leaveSubTab === "balances"
                                      ? "bg-wt-surface-3 text-wt-text hover:bg-wt-surface-3 hover:text-wt-text"
                                      : "text-wt-text-muted hover:bg-wt-surface-2"
                                  }`}
                                >
                                  Balances
                                </Button>
                              ) : null}
                                </>
                              )}
                            </div>
                          ) : null}
                          {leaveSubTab === "balances" && hasHrAccess ? (
                            <HrLeaveBalancesPanel actionLoading={actionLoading} runAction={runAction} />
                          ) : leaveSubTab === "comp-off" ? (
                            <CompOffPageClient
                              embedded
                              flowScope="earn"
                              forcedTab={compOffForcedTab}
                            />
                          ) : leaveSubTab === "my" || leaveSubTab === "wfh" ? (
                        <section className="grid gap-4 xl:grid-cols-1">
                          <div className="space-y-4">
                            {submitsToHrForReview ? <HrReviewNoticeBanner /> : null}
                            {leaveSubTab === "my" &&
                            normalizeUserRequestType(leaveRequestForm.request_type) === "LEAVE" ? (
                              <LeaveBalanceSummary />
                            ) : null}
                            <LeaveWorkflowNotice variant={leaveWorkflowVariant} />
                            <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                              <h3 className="font-semibold mb-3">
                                {leaveSubTab === "wfh" ? "Work from home" : "Time off/comp off"}
                              </h3>
                              <div className="space-y-3">
                                <div
                                  className={`grid grid-cols-1 gap-3 ${
                                    leaveSubTab === "wfh" ? "sm:grid-cols-2" : "sm:grid-cols-3"
                                  }`}
                                >
                                  {leaveSubTab === "my" ? (
                                    <SelectField
                                      label="Request Type"
                                      required
                                      value={leaveRequestForm.request_type}
                                      options={leaveRequestTypeOptions}
                                      onChange={(v) => setLeaveRequestForm((p) => ({ ...p, request_type: v }))}
                                    />
                                  ) : null}
                                  <InputField
                                    label="From Date"
                                    required
                                    value={leaveRequestForm.request_from_date}
                                    onChange={(v) =>
                                      setLeaveRequestForm((p) => ({
                                        ...p,
                                        request_from_date: v,
                                        request_to_date: p.is_half_day ? v : p.request_to_date,
                                      }))
                                    }
                                    type="date"
                                  />
                                  <InputField
                                    label="To Date"
                                    required
                                    value={
                                      leaveRequestForm.is_half_day
                                        ? leaveRequestForm.request_from_date
                                        : leaveRequestForm.request_to_date
                                    }
                                    onChange={(v) => {
                                      if (leaveRequestForm.is_half_day) return;
                                      setLeaveRequestForm((p) => ({ ...p, request_to_date: v }));
                                    }}
                                    type="date"
                                  />
                                </div>
                                {leaveSubTab === "my" &&
                                normalizeUserRequestType(leaveRequestForm.request_type) === "LEAVE" ? (
                                  <Label className="text-sm flex items-center gap-2 font-normal">
                                    <Checkbox
                                      checked={leaveRequestForm.is_half_day}
                                      onCheckedChange={(checked) => {
                                        setLeaveRequestForm((p) => ({
                                          ...p,
                                          is_half_day: checked,
                                          request_to_date: checked ? p.request_from_date : p.request_to_date,
                                        }));
                                      }}
                                    />
                                    Half-day leave (single day only)
                                  </Label>
                                ) : null}
                                {requiresClientApproval &&
                                (leaveSubTab === "wfh" ||
                                  normalizeUserRequestType(leaveRequestForm.request_type) === "LEAVE") ? (
                                  <Label className="text-sm flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-normal text-amber-900">
                                    <Checkbox
                                      className="mt-0.5"
                                      checked={leaveRequestForm.client_approval}
                                      onCheckedChange={(checked) =>
                                        setLeaveRequestForm((p) => ({
                                          ...p,
                                          client_approval: checked,
                                        }))
                                      }
                                    />
                                    <span>
                                      I confirm client approval for this request (required on active client/staffing
                                      projects).
                                    </span>
                                  </Label>
                                ) : null}
                                {leaveSubTab === "my" &&
                                normalizeUserRequestType(leaveRequestForm.request_type) === "LEAVE" ? (
                                  <LeaveManagerSelector
                                    selectedEmails={selectedLeaveManagerEmails}
                                    onChange={setSelectedLeaveManagerEmails}
                                    disabled={actionLoading}
                                  />
                                ) : null}
                                {leaveSubTab === "my" &&
                                normalizeUserRequestType(leaveRequestForm.request_type) === "LEAVE" ? (
                                  <LeaveAdditionalRecipientsSelector
                                    selectedEmails={selectedAdditionalRecipientEmails}
                                    onChange={setSelectedAdditionalRecipientEmails}
                                    disabled={actionLoading}
                                  />
                                ) : null}
                                <TextAreaField label="Comments" required value={leaveRequestForm.comments} onChange={(v) => setLeaveRequestForm((p) => ({ ...p, comments: v }))} />
                              </div>
                              <div className="mt-4 flex gap-2">
                                <Button variant="brand" type="button" className="px-3 py-2" onClick={() =>
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
                                        leaveSubTab === "wfh"
                                          ? "WFH"
                                          : leaveRequestForm.request_type;
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
                                        throw new Error("Select at least one manager to notify.");
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
                                        setSelectedAdditionalRecipientEmails([]);
                                        setEditingLeaveRequestId("");
                                        try {
                                          await loadMyLeaveRequests();
                                        } catch {
                                          /* submission succeeded */
                                        }
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
                                          selected_manager_emails:
                                            leaveSubTab === "my" &&
                                            normalizeUserRequestType(requestType) === "LEAVE"
                                              ? selectedLeaveManagerEmails
                                              : undefined,
                                          additional_recipient_emails:
                                            leaveSubTab === "my" &&
                                            normalizeUserRequestType(requestType) === "LEAVE" &&
                                            selectedAdditionalRecipientEmails.length
                                              ? selectedAdditionalRecipientEmails
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
                                      setSelectedAdditionalRecipientEmails([]);
                                      setEditingLeaveRequestId("");
                                      try {
                                        await loadMyLeaveRequests();
                                      } catch {
                                        /* submission succeeded; ignore refresh issue */
                                      }
                                    })
                                  }
                                  disabled={actionLoading}
                                >
                                  {editingLeaveRequestId ? "Save Changes" : "Submit Request"}
                                </Button>
                                {editingLeaveRequestId ? (
                                  <Button variant="ghost" type="button" className="px-3 py-2" onClick={() => {
                                      setLeaveRequestForm(createDefaultLeaveRequestForm());
                                      setEditingLeaveRequestId("");
                                    }}
                                    disabled={actionLoading}
                                  >
                                    Cancel Edit
                                  </Button>
                                ) : null}
                              </div>
                            </div>
          
                            <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <h3 className="font-semibold">My Previous Requests</h3>
                                <div className="flex flex-wrap items-end gap-2 flex-1 min-w-[200px] justify-end">
                                  <label className="sr-only" htmlFor="my-leave-search">
                                    Search my requests
                                  </label>
                                  <input
                                    id="my-leave-search"
                                    type="search"
                                    className="input-field min-w-[200px] flex-1 max-w-md px-3 py-2 text-sm"
                                    placeholder="Search by type, date, status, reason, comments…"
                                    value={myLeaveSearch}
                                    onChange={(e) => setMyLeaveSearch(e.target.value)}
                                    aria-label="Search my leave requests"
                                  />
                                  <Button variant="brand" type="button" className="px-3 py-2" onClick={() => runAction("Refresh my requests", loadMyLeaveRequests)}
                                    disabled={actionLoading}
                                  >
                                    Refresh
                                  </Button>
                                </div>
                              </div>
                              {activeSelfServeRequests.length ? (
                                <ScrollableTable maxHeightClass="max-h-[min(50vh,380px)]">
                                  <WtTable>
                                    <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead>Request Type</TableHead>
                                        <TableHead>
                                          <TableSortHeader
                                            label="From"
                                            activeDirection={activeSortDirectionForColumn(
                                              "from",
                                              myLeaveSortId,
                                              LEAVE_REQUEST_SORT_OPTIONS
                                            )}
                                            sortable
                                            onSort={() =>
                                              setMyLeaveSortId(
                                                toggleColumnSort(
                                                  "from",
                                                  myLeaveSortId,
                                                  LEAVE_REQUEST_SORT_OPTIONS
                                                )
                                              )
                                            }
                                          />
                                        </TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>Manager status</TableHead>
                                        <TableHead>Manager reason</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Comments</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {myLeavePagination.pageItems.map((row, idx) => {
                                        const requestId = String(
                                          row.user_request_id ??
                                            row.userRequestId ??
                                            row.request_id ??
                                            row.requestId ??
                                            row.id ??
                                            ""
                                        ).trim();
                                        const rowRecord = row as Record<string, unknown>;
                                        const finalStatus = requestFinalStatus(rowRecord);
                                        const managerStatus = requestManagerStatus(rowRecord);
                                        const managerReason = formatStageRejectionReason(
                                          managerStatus,
                                          pickRowField(rowRecord, "manager_reason", "managerReason")
                                        );
                                        const isPending = finalStatus === "PENDING";
                                        return (
                                          <TableRow key={`${requestId || "myreq"}-${idx}`}>
                                            <TableCell className="px-3 py-2 whitespace-nowrap">
                                              {formatUserRequestTypeLabel(row.request_type ?? row.requestType)}
                                            </TableCell>
                                            <TableCell className="px-3 py-2 whitespace-nowrap">{String(row.request_from_date ?? row.requestFromDate ?? "—")}</TableCell>
                                            <TableCell className="px-3 py-2 whitespace-nowrap">{String(row.request_to_date ?? row.requestToDate ?? "—")}</TableCell>
                                            <TableCell className="px-3 py-2 whitespace-nowrap">
                                              {formatApprovalStageLabel(managerStatus)}
                                            </TableCell>
                                            <TableCell
                                              className="px-3 py-2 max-w-[200px] truncate"
                                              title={managerReason !== "—" ? managerReason : undefined}
                                            >
                                              {managerReason}
                                            </TableCell>
                                            <TableCell className="px-3 py-2 whitespace-nowrap">
                                              {formatApprovalStageLabel(finalStatus)}
                                            </TableCell>
                                            <TableCell className="px-3 py-2 max-w-[240px] truncate">{String(row.comments ?? "—")}</TableCell>
                                            <TableCell className="px-3 py-2 text-right">
                                              <div className="inline-flex items-center justify-end gap-1">
                                                <Button variant="brand" size="xs" type="button" className="px-2.5 py-1.5 text-xs" disabled={actionLoading || !requestId || !isPending} onClick={() => {
                                                    const rowType = String(
                                                      row.request_type ?? row.requestType ?? "LEAVE"
                                                    );
                                                    setLeaveRequestForm({
                                                      request_from_date: String(row.request_from_date ?? row.requestFromDate ?? ""),
                                                      request_to_date: String(row.request_to_date ?? row.requestToDate ?? ""),
                                                      request_type: rowType,
                                                      comments: String(row.comments ?? ""),
                                                      is_half_day: Boolean(row.is_half_day ?? row.isHalfDay ?? false),
                                                      client_approval: false,
                                                    });
                                                    setEditingLeaveRequestId(requestId);
                                                    if (normalizeUserRequestType(rowType) === "WFH") {
                                                      setLeaveSubTab("wfh");
                                                    } else {
                                                      setLeaveSubTab("my");
                                                    }
                                                  }}
                                                >
                                                  Edit
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="destructive"
                                                  size="xs"
                                                  disabled={actionLoading || !requestId || !isPending}
                                                  onClick={() =>
                                                    runAction(
                                                      userRequestActionLabel(
                                                        row.request_type ?? row.requestType,
                                                        "revoke"
                                                      ),
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
                                                    })
                                                  }
                                                >
                                                  Revoke
                                                </Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </WtTable>
                                </ScrollableTable>
                              ) : (leaveSubTab === "wfh" ? filteredWfhTabRequests : filteredLeaveTabRequests).length ? (
                                <p className="text-sm text-wt-text-muted">
                                  No requests match your search.
                                </p>
                              ) : (
                                <p className="text-sm text-wt-text-muted">No previous requests found.</p>
                              )}
                              {activeSelfServeRequests.length > 0 ? (
                                <ListPagination
                                  className="mt-3"
                                  page={myLeavePagination.page}
                                  totalPages={myLeavePagination.totalPages}
                                  totalItems={myLeavePagination.totalItems}
                                  rangeStart={myLeavePagination.rangeStart}
                                  rangeEnd={myLeavePagination.rangeEnd}
                                  pageSize={myLeavePagination.pageSize}
                                  pageSizeOptions={myLeavePagination.pageSizeOptions}
                                  onPageChange={myLeavePagination.setPage}
                                  onPageSizeChange={myLeavePagination.setPageSize}
                                />
                              ) : null}
                            </div>
                          </div>
                        </section>
                          ) : (leaveSubTab === "team" || leaveSubTab === "org") && canViewTeamLeave ? (
                        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                          {leaveSubTab === "team" && hasManagerAccess && !hasHrAccess ? (
                            <ManagerTeamOnLeavePanel />
                          ) : null}
                          {hasHrAccess ? (
                            <LeaveWorkflowNotice
                              variant="hr"
                              scope={leaveSubTab === "org" ? "org" : "team"}
                            />
                          ) : hasDmAccess ? (
                            <LeaveWorkflowNotice variant="dm" />
                          ) : null}
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
                              options={[...USER_REQUEST_FILTER_TYPE_OPTIONS]}
                              onChange={(v) => setEmployeeRequestFilters((p) => ({ ...p, requestType: v }))}
                            />
                            <Button variant="brand" type="button" className="px-3 py-2 h-10" onClick={() =>
                                runAction(
                                  leaveSubTab === "org" ? "Refresh employee requests" : "Refresh team requests",
                                  () =>
                                    loadEmployeeRequestsForApprover(
                                      leaveSubTab === "org" ? "org" : "team"
                                    )
                                )
                              }
                              disabled={actionLoading}
                            >
                              Fetch Requests
                            </Button>
                            <label className="sr-only" htmlFor="team-leave-search">
                              Search team requests
                            </label>
                            <input
                              id="team-leave-search"
                              type="search"
                              className="input-field min-w-[200px] flex-1 max-w-md px-3 py-2 text-sm h-10"
                              placeholder="Search by employee, type, status…"
                              value={teamLeaveSearch}
                              onChange={(e) => setTeamLeaveSearch(e.target.value)}
                              aria-label="Search team leave requests"
                            />
                          </div>

                          {sortedEmployeeRequests.length ? (
                            <ScrollableTable maxHeightClass="max-h-[min(70vh,520px)]">
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
                                    <TableHead>
                                      {hasHrAccess || hasDmAccess ? "Final status" : "Status"}
                                    </TableHead>
                                    {hasHrAccess || hasDmAccess ? (
                                      <>
                                        <TableHead>
                                          {firstLineStatusColumnLabel}
                                        </TableHead>
                                        {hasHrAccess ? (
                                          <TableHead>
                                            Manager reason
                                          </TableHead>
                                        ) : null}
                                      </>
                                    ) : null}
                                    <TableHead>Comments</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {teamLeavePagination.pageItems.map((row, idx) => {
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
                                    const hrCanActOnRow = canHrShowTeamRequestActions(rowRecord, {
                                      hasHrAccess,
                                    });
                                    const showManagerActions =
                                      (hasManagerAccess || hasDmAccess) &&
                                      !hrCanActOnRow &&
                                      canManagerActOnRequest(rowRecord, { hasManagerAccess, hasDmAccess });
                                    const showManagerReject =
                                      showManagerActions &&
                                      canManagerRejectRequest(rowRecord, { hasManagerAccess, hasDmAccess });
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
                                          {formatApprovalStageLabel(status)}
                                        </TableCell>
                                        {hasHrAccess || hasDmAccess ? (
                                          <>
                                            <TableCell className="px-3 py-2 whitespace-nowrap">
                                              {formatApprovalStageLabel(managerStatus)}
                                            </TableCell>
                                            {hasHrAccess ? (
                                              <TableCell
                                                className="px-3 py-2 max-w-[220px] truncate"
                                                title={managerReason || undefined}
                                              >
                                                {managerReason || "—"}
                                              </TableCell>
                                            ) : null}
                                          </>
                                        ) : null}
                                        <TableCell className="px-3 py-2 max-w-[220px] truncate">{String(row.comments ?? "—")}</TableCell>
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
                                                        await loadEmployeeRequestsForApprover(leaveSubTab === "org" ? "org" : "team");
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
                                                        await loadEmployeeRequestsForApprover(leaveSubTab === "org" ? "org" : "team");
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
                                                      await loadEmployeeRequestsForApprover(leaveSubTab === "org" ? "org" : "team");
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
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </WtTable>
                            </ScrollableTable>
                          ) : employeeRequests.length ? (
                            <p className="text-sm text-wt-text-muted">
                              No requests match your search.
                            </p>
                          ) : (
                            <p className="text-sm text-wt-text-muted">
                              No employee requests loaded yet. Click <strong>Fetch Requests</strong>.
                            </p>
                          )}
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
                        </section>
                          ) : null}
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
