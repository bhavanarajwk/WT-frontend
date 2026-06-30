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
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/api/httpClient";
import { endpoints } from "@/api/endpoints";
import { hrmsService, type LeaveManagerOption } from "@/services/hrms.service";
import { useMyLeaveRequests } from "@/hooks/leave/useMyLeaveRequests";
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

const LEAVE_REQUESTS_TABLE_MIN_HEIGHT = "min-h-[320px]";
const MY_LEAVE_TABLE_COL_COUNT = 8;

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
  const myLeaveRequestsQ = useMyLeaveRequests(userEmail, false);
  const myLeaveRequests = myLeaveRequestsQ.rows;
  const myLeaveRequestsLoading = myLeaveRequestsQ.isFetching;
  const loadMyLeaveRequests = useCallback(async () => {
    await myLeaveRequestsQ.refetch();
  }, [myLeaveRequestsQ.refetch]);
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
  const [selectedWfhManagerEmails, setSelectedWfhManagerEmails] = useState<string[]>([]);
  const [wfhManagerOptions, setWfhManagerOptions] = useState<LeaveManagerOption[]>([]);
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
    () => profileAssignedProjects,
    [profileAssignedProjects]
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

  useEffect(() => {
    if (leaveSubTab !== "wfh") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await hrmsService.getWfhManagerOptions();
        const items: LeaveManagerOption[] = [];
        const data = res?.data as { items?: LeaveManagerOption[] } | undefined;
        if (data?.items) items.push(...data.items);
        if (!cancelled) setWfhManagerOptions(items);
      } catch {
        if (!cancelled) setWfhManagerOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [leaveSubTab]);

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
    if (!canAccessProfile || requiresSelfOnboarding) return;
    if (leaveSubTab !== "my" && leaveSubTab !== "wfh") return;
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
  }, [canAccessProfile, requiresSelfOnboarding, leaveSubTab]);

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

  const teamTableColCount = useMemo(() => {
    let count = 7;
    if (hasHrAccess || hasDmAccess) count += 1;
    if (hasHrAccess) count += 1;
    return count;
  }, [hasDmAccess, hasHrAccess]);

  const fetchTeamRequests = useCallback(
    async (scope: "team" | "org") => {
      setTeamRequestsLoading(true);
      try {
        await loadEmployeeRequestsForApprover(scope);
      } catch {
        setEmployeeRequests([]);
      } finally {
        setTeamRequestsLoading(false);
      }
    },
    [loadEmployeeRequestsForApprover]
  );

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
        hasHrAccess ? { value: "org", label: "All Employee Requests" } : null,
        showCompOffTab ? { value: "comp-off", label: "Comp Off Credit" } : null,
        hasHrAccess ? { value: "balances", label: "Balances" } : null,
      ].filter((item): item is { value: string; label: string } => Boolean(item));
    }

    return [
      { value: "my", label: "Leave Requests" },
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
                                    | "org"
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
                          ) : leaveSubTab === "my" || leaveSubTab === "wfh" ? (
                        <div className="space-y-4">
                          <div className="space-y-4">
                            {submitsToHrForReview ? <HrReviewNoticeBanner /> : null}
                            {leaveSubTab === "my" &&
                            normalizeUserRequestType(leaveRequestForm.request_type) === "LEAVE" ? (
                              <LeaveBalanceSummary />
                            ) : null}
                            <LeaveWorkflowNotice variant={leaveWorkflowVariant} />
                            <div className="space-y-3">
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
                                {leaveSubTab === "wfh" ? (
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">
                                      Select Managers <span className="text-rose-600">*</span>
                                    </p>
                                    <p className="text-xs text-wt-text-muted">
                                      Selected managers receive a notification and can approve or reject the request.
                                    </p>
                                    {wfhManagerOptions.length > 0 ? (
                                      <div className="max-h-48 space-y-2 overflow-auto rounded-xl border border-wt-border bg-wt-surface-2/30 p-3">
                                        {wfhManagerOptions.map((option) => {
                                          const email = String(option.email ?? "").trim();
                                          if (!email) return null;
                                          const checked = selectedWfhManagerEmails
                                            .map((e) => e.toLowerCase())
                                            .includes(email.toLowerCase());
                                          return (
                                            <label
                                              key={email}
                                              className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-wt-surface-2"
                                            >
                                              <input
                                                type="checkbox"
                                                className="mt-0.5"
                                                checked={checked}
                                                disabled={actionLoading}
                                                onChange={() => {
                                                  const nextSet = new Set(
                                                    selectedWfhManagerEmails.map((e) => e.toLowerCase())
                                                  );
                                                  if (nextSet.has(email.toLowerCase())) {
                                                    nextSet.delete(email.toLowerCase());
                                                  } else {
                                                    nextSet.add(email.toLowerCase());
                                                  }
                                                  const ordered = wfhManagerOptions
                                                    .map((row) => String(row.email ?? "").trim().toLowerCase())
                                                    .filter((v) => nextSet.has(v));
                                                  setSelectedWfhManagerEmails(ordered);
                                                }}
                                              />
                                              <span className="text-sm">
                                                <span className="font-medium">{option.name || email}</span>
                                                {option.project_name ? (
                                                  <span className="block text-xs text-wt-text-muted">
                                                    {option.project_name}
                                                  </span>
                                                ) : null}
                                                <span className="block text-xs text-wt-text-muted">{email}</span>
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-wt-text-muted">
                                        Loading managers…
                                      </p>
                                    )}
                                  </div>
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
                                      if (
                                        leaveSubTab === "wfh" &&
                                        !selectedWfhManagerEmails.length
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
                                        setSelectedWfhManagerEmails([]);
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
                                              : leaveSubTab === "wfh"
                                                ? selectedWfhManagerEmails
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
                                      setSelectedWfhManagerEmails([]);
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
          
                            <div className="space-y-3">
                              <div className="flex flex-nowrap items-end gap-2 overflow-x-auto pb-0.5">
                                <h3 className="font-semibold shrink-0 mr-auto">My Previous Requests</h3>
                                <label className="sr-only" htmlFor="my-leave-search">
                                  Search my requests
                                </label>
                                <input
                                  id="my-leave-search"
                                  type="search"
                                  className="input-field min-w-[200px] shrink-0 px-3 py-2 text-sm h-10"
                                  placeholder="Search by type, date, status…"
                                  value={myLeaveSearch}
                                  onChange={(e) => setMyLeaveSearch(e.target.value)}
                                  aria-label="Search my leave requests"
                                />
                                <Button
                                  variant="brand"
                                  type="button"
                                  className="shrink-0 px-3 py-2 h-10"
                                  onClick={() => runAction("Refresh my requests", loadMyLeaveRequests)}
                                  disabled={actionLoading || myLeaveRequestsLoading}
                                >
                                  Refresh
                                </Button>
                              </div>
                              <ScrollableTable
                                maxHeightClass="max-h-[min(50vh,380px)]"
                                className={LEAVE_REQUESTS_TABLE_MIN_HEIGHT}
                              >
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
                                      <TableHead>Manager Status</TableHead>
                                      <TableHead>Manager Reason</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Comments</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {myLeaveRequestsLoading ? (
                                      Array.from({ length: 5 }).map((_, rowIndex) => (
                                        <TableRow key={`my-leave-skeleton-${rowIndex}`}>
                                          {Array.from({ length: MY_LEAVE_TABLE_COL_COUNT }).map(
                                            (_, colIndex) => (
                                              <TableCell key={colIndex} className="px-3 py-2">
                                                <Skeleton className="h-4 w-full" />
                                              </TableCell>
                                            )
                                          )}
                                        </TableRow>
                                      ))
                                    ) : myLeavePagination.pageItems.length ? (
                                      myLeavePagination.pageItems.map((row, idx) => {
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
                                      })
                                    ) : (
                                      <TableRow className="hover:bg-transparent">
                                        <TableCell
                                          colSpan={MY_LEAVE_TABLE_COL_COUNT}
                                          className="h-[280px] text-center align-middle text-sm text-wt-text-muted"
                                        >
                                          {(leaveSubTab === "wfh"
                                            ? filteredWfhTabRequests
                                            : filteredLeaveTabRequests
                                          ).length
                                            ? "No requests match your search."
                                            : "No Data"}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </WtTable>
                              </ScrollableTable>
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
                        </div>
                          ) : (leaveSubTab === "team" || leaveSubTab === "org") && canViewTeamLeave ? (
                        <div className="space-y-4">
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
                                runAction(
                                  leaveSubTab === "org" ? "Refresh employee requests" : "Refresh team requests",
                                  () =>
                                    fetchTeamRequests(leaveSubTab === "org" ? "org" : "team")
                                )
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
                                  <TableHead>
                                    {hasHrAccess || hasDmAccess ? "Final Status" : "Status"}
                                  </TableHead>
                                  {hasHrAccess || hasDmAccess ? (
                                    <>
                                      <TableHead>
                                        {firstLineStatusColumnLabel}
                                      </TableHead>
                                      {hasHrAccess ? (
                                        <TableHead>
                                          Manager Reason
                                        </TableHead>
                                      ) : null}
                                    </>
                                  ) : null}
                                  <TableHead>Comments</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
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
