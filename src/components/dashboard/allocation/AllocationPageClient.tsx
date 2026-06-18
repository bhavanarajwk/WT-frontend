"use client";

import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiClient, type ApiEnvelope } from "@/api/httpClient";
import { endpoints } from "@/api/endpoints";
import { hrmsService, type PagedData } from "@/services/hrms.service";
import { ApiError } from "@/api/error";
import { toRows, toPagedRows } from "@/utils/apiRows";
import {
  formatActionErrorMessage,
  formatActionSuccessMessage,
  userRequestActionLabel,
} from "@/utils/actionToast";
import { AllocationExtensionPanel } from "@/components/dashboard/sections/AllocationExtensionPanel";
import { EmployeeAttendancePanel } from "@/components/dashboard/sections/EmployeeAttendancePanel";
import { AccountManagerSelect } from "@/components/allocation/AccountManagerSelect";
import { AllocatedPercentSelect } from "@/components/allocation/AllocatedPercentSelect";
import { AssignProjectManagerPanel } from "@/components/allocation/AssignProjectManagerPanel";
import { ProjectTypeSelect } from "@/components/allocation/ProjectTypeSelect";
import { ProjectTypeFilterSelect } from "@/components/allocation/ProjectTypeFilterSelect";
import { useAllocationEmployees } from "@/hooks/useAllocationEmployees";
import { useAllocationPercentages } from "@/hooks/useAllocationPercentages";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import {
  ALLOCATION_FORECAST_DAYS,
  ALLOCATION_FORECAST_PAGE,
  ALLOCATION_FORECAST_SIZE,
  ALLOCATION_LIST_PAGE,
  ALLOCATION_LIST_SIZE,
} from "@/constants/allocationApi";
import {
  formatProjectTypeCode,
  isKnownProjectTypeCode,
  isStaffingProjectTypeCode,
  projectTypeCodeFromRow,
  projectTypeLabelByCode,
  resolveProjectTypeForProjectCode,
} from "@/utils/projectTypes";
import { normalizePickerEmail } from "@/utils/learning/onboardOptions";
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
  formatAllocatedHoursPercentLabel,
} from "@/utils/dashboard/validation";
import { formatApiDateDisplay, normalizeToApiDate } from "@/utils/apiDate";
import {
  allocationPercentLabelByCode,
  allocationPercentOptionsForDesignation,
  ALL_ALLOCATION_PERCENT_LABELS,
  formatAllocatedPercentDisplay,
  isKnownAllocationPercent,
  isValidAllocationPercentForDesignation,
  resolveAllocatedPercentFromRow,
} from "@/utils/allocationPercent";
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
  allocationProjectDisplayName,
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
import { allocationEmployeesToPickerUsers } from "@/utils/allocationEmployees";
import { isHrCreatedProjectCode } from "@/utils/projectPicker";
import { MetricCard } from "@/components/dashboard/ui/MetricCard";
import { InputField, SelectField, FileField, UploadTile, FieldLabel, NativeSelectField } from "@/components/dashboard/ui/forms";
import {
  ProfilePhotoAvatar,
  ProfileField,
  formatSecondarySkillsForProfile,
} from "@/components/dashboard/ui/profile";
import { DataTable } from "@/components/dashboard/ui/DataTable";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  activeSortDirectionForColumn,
  applyListSort,
  PROJECT_SORT_OPTIONS,
  TIMELOG_SORT_OPTIONS,
  ALLOCATION_FORECAST_SORT_OPTIONS,
  ALLOCATION_LIST_SORT_OPTIONS,
  toggleColumnSort,
} from "@/utils/listSort";
import { IconUser, IconPencil, IconTrash, IconRefresh } from "@/components/dashboard/ui/icons";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import {
  createEmptyAllocationForm,
  createEmptyProjectForm,
} from "@/utils/allocationFormState";
import {
  allocationRowId,
  isEditableAllocationRow,
  isSupersededAllocationRow,
  mergeAllocationListAfterUpdate,
  parseAllocationForecastRows,
  parseAllocationListRows,
  parseAllocationUpdateResponse,
  parseEmployeeAllocationsResponse,
  parseDeallocatedAllocationListRows,
  ALLOCATION_LIST_DEFAULT_SORT_ID,
  filterAllocationListBySearch,
  mergeUniqueAllocationListRows,
  sortAllocationListForDisplay,
  sortAllocationListRows,
} from "@/utils/allocationList";
import { TALENT_POOL_QUERY_KEY } from "@/hooks/allocation/useTalentPool";
import {
  fetchAllocationOnboardDirectory,
  ALLOCATION_ONBOARD_DIRECTORY_QUERY_KEY,
  useAllocationOnboardDirectory,
} from "@/hooks/allocation/useAllocationOnboardDirectory";
import {
  fetchHrProjects,
  HR_PROJECTS_QUERY_KEY,
  useHrProjects,
} from "@/hooks/allocation/useHrProjects";



export function AllocationPageClient() {
  const isManagerRoleLabel = (value: unknown): boolean =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .includes("manager");
  const REQUEST_TYPE_ALIASES: Record<string, string[]> = {
    LEAVE: ["LEAVE"],
    WFH: ["WFH"],
    COMP_OFF: ["COMP_OFF", "COMPOFF", "COMP-OFF", "COMP OFF"],
  };

  const { user, signOut, refresh: refreshSession } = useAuth();
  const {
    requiresSelfOnboarding,
    isSelfOnboarded,
    setIsSelfOnboarded,
    loadMyProfile,
    employeeSelfServeProfile,
    profile: employeeProfile,
  } = useDashboardAccess();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const talentPoolPrefillHandled = useRef<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
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
  const [allocationsLoading, setAllocationsLoading] = useState(false);
  const [allocationsLoadError, setAllocationsLoadError] = useState<string | null>(null);
  const [selectedEmployeeAllocations, setSelectedEmployeeAllocations] = useState<{
    employeeEmail: string;
    employeeName: string;
    totalAllocatedPercent: number;
    allocations: Array<Record<string, unknown>>;
    highlightedAllocationId: string;
  } | null>(null);
  const [employeeAllocationsLoading, setEmployeeAllocationsLoading] = useState(false);
  const [employeeAllocationsError, setEmployeeAllocationsError] = useState<string | null>(null);
  const [allocationForecastRows, setAllocationForecastRows] = useState<Array<Record<string, unknown>>>([]);
  const [allocationForecastDays, setAllocationForecastDays] = useState(ALLOCATION_FORECAST_DAYS);
  const [allocationForecastDaysInput, setAllocationForecastDaysInput] = useState(
    String(ALLOCATION_FORECAST_DAYS)
  );
  const [allocationForecastLoading, setAllocationForecastLoading] = useState(false);
  const [allocationForecastLoadError, setAllocationForecastLoadError] = useState<string | null>(null);
  const allocationRecordsRef = useRef<HTMLDivElement>(null);
  const projectCrudFormRef = useRef<HTMLDivElement>(null);
  const allocationFormRef = useRef<HTMLDivElement>(null);
  const [allocationRoles, setAllocationRoles] = useState<string[]>([]);
  const [allocationEmployeePickerOpen, setAllocationEmployeePickerOpen] = useState(false);
  const [allocationEmployeePickerQuery, setAllocationEmployeePickerQuery] = useState("");
  const allocationEmployeeComboboxRef = useRef<HTMLDivElement>(null);
  const [pickerEmployeeAllocations, setPickerEmployeeAllocations] = useState<{
    employeeEmail: string;
    employeeName: string;
    totalAllocatedPercent: number;
    allocations: Array<Record<string, unknown>>;
  } | null>(null);
  const [pickerEmployeeAllocationsLoading, setPickerEmployeeAllocationsLoading] = useState(false);
  const [pickerEmployeeAllocationsError, setPickerEmployeeAllocationsError] = useState<string | null>(
    null
  );
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
    requestType: "ALL",
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
  const [projectForm, setProjectForm] = useState(createEmptyProjectForm);
  const [editingProjectCode, setEditingProjectCode] = useState<string>("");
  const [projectFilters, setProjectFilters] = useState({
    search: "",
    project_type: "ALL",
  });
  const [projectSortId, setProjectSortId] = useState(PROJECT_SORT_OPTIONS[0].id);
  const [allocationListSearch, setAllocationListSearch] = useState("");
  const [allocationListSortId, setAllocationListSortId] = useState(ALLOCATION_LIST_DEFAULT_SORT_ID);
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
  const [allocationForm, setAllocationForm] = useState(createEmptyAllocationForm);
  const [editingAllocationId, setEditingAllocationId] = useState<string>("");
  const [allocationHrSubTab, setAllocationHrSubTab] = useState<
    "project" | "allocate" | "assign-pm" | "list"
  >("project");
  const [pmAssignPrefill, setPmAssignPrefill] = useState<{
    projectCode?: string;
    userEmail?: string;
  } | null>(null);
  const [timelogSubTab, setTimelogSubTab] = useState<"my" | "team">("my");
  const [leaveSubTab, setLeaveSubTab] = useState<"my" | "team">("my");
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = userRoles.includes("ROLE_MANAGER");
  const hasAllocationAccess = hasHrAccess;
  const hasProjectTypeAccess = hasHrAccess || hasManagerAccess;
  const hrProjectsQ = useHrProjects(hasHrAccess);
  const hrProjectRawRows = hrProjectsQ.data?.rawRows ?? [];
  const allocationProjects = hrProjectsQ.data?.pickerRows ?? [];
  useAllocationOnboardDirectory(hasHrAccess);
  const refreshHrProjects = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: HR_PROJECTS_QUERY_KEY });
  }, [queryClient]);
  const { data: activeProjectTypes = [] } = useProjectTypes(true, hasProjectTypeAccess);
  const { data: allProjectTypes = [] } = useProjectTypes(false, hasProjectTypeAccess);
  const { data: allocationEmployeeRows = [] } = useAllocationEmployees(hasAllocationAccess);
  const allocationUsers = useMemo(
    () => allocationEmployeesToPickerUsers(allocationEmployeeRows),
    [allocationEmployeeRows]
  );
  const projectTypeLabels = useMemo(
    () => projectTypeLabelByCode(allProjectTypes),
    [allProjectTypes]
  );
  const { data: allocationPercentOptions = [] } = useAllocationPercentages(
    allocationForm.role,
    hasAllocationAccess && Boolean(allocationForm.role.trim())
  );
  const allocationPercentLabels = useMemo(
    () => allocationPercentLabelByCode(ALL_ALLOCATION_PERCENT_LABELS),
    []
  );
  /** HR without manager portfolio — no allocated projects; use Team timelogs for org view */
  const timelogHrNoSelfProject =
    userRoles.includes("ROLE_HR") && !hasManagerAccess;
  const canExportTimelog = hasHrAccess || hasManagerAccess;
  const canAccessProfile = Boolean(user);
  useEffect(() => {
        if (!hasManagerAccess && !hasHrAccess && timelogSubTab === "team") {
      setTimelogSubTab("my");
    }
  }, [ hasManagerAccess, hasHrAccess, timelogSubTab]);
  const loadManagerData = useCallback(
    async (force = false) => {
      if (!hasManagerAccess) return { projectRows: [] as Array<Record<string, unknown>>, detailRows: [] as Array<Record<string, unknown>> };
      if (!force && managerDataLoadedRef.current) {
        return {
          projectRows: managerProjectsRef.current,
          detailRows: managerPortfolioRowsRef.current,
        };
      }
      if (managerDataLoadingRef.current) {
        return {
          projectRows: managerProjectsRef.current,
          detailRows: managerPortfolioRowsRef.current,
        };
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
        managerProjectsRef.current = effectiveProjectRows;
        managerPortfolioRowsRef.current = detailRows;
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
    [hasManagerAccess]
  );

  const priorEmploymentDocsRequired = useMemo(() => {
    const raw = String(selfOnboardForm.yoe ?? "").trim().replace(",", ".");
    if (!raw) return false;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0;
  }, [selfOnboardForm.yoe]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
        if (requiresSelfOnboarding) return;
    if (!employeeSelfServeProfile) return;
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
  }, [ canAccessProfile, requiresSelfOnboarding, employeeSelfServeProfile]);
  useEffect(() => {
    // Employee onboarding master data is not rendered on the allocation page.
    return;
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
    // Band/designation lookups are only needed on the employee onboarding page.
    return;
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
  }, [ onboardForm.band_id, onboardForm.department, onboardForm.role, onboardDepartments]);
  useEffect(() => {
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
  }, [user?.roles]);
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
  }, [ hasManagerAccess]);  useEffect(() => {
        if (!hasHrAccess) return;
    return;
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
  }, [ hasHrAccess, requiresSelfOnboarding]);
  useEffect(() => {
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
  }, [ timelogSubTab, hasManagerAccess, loadManagerData]);
  useEffect(() => {
    if (!hasManagerAccess) return;
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
  }, [ timelogSubTab, hasManagerAccess, selectedManagerProjectCode]);
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
      setToast({ type: "success", message: formatActionSuccessMessage(label) });
    } catch (error) {
      const backendMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "";
      setToast({
        type: "error",
        message: formatActionErrorMessage(label, backendMessage),
      });
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
      map[code] = name || code;
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
        allocated_project = projectDisplayByCode[code] ?? (titleOnRow || code);
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
  useEffect(() => {
    const allowed = allocationPercentOptionsForDesignation(
      allocationForm.role,
      allocationPercentOptions
    );
    if (
      allocationForm.allocated_percent &&
      !isKnownAllocationPercent(allocationForm.allocated_percent, allowed)
    ) {
      setAllocationForm((p) => ({ ...p, allocated_percent: "" }));
    }
  }, [allocationForm.role, allocationPercentOptions, allocationForm.allocated_percent]);
  const allocationEmployeeSelectLabel = useMemo(() => {
    const email = allocationForm.employee_email.trim().toLowerCase();
    if (!email) return "Select employee";
    const hit = allocationUsers.find((u) => u.email.toLowerCase() === email);
    return hit?.name ?? allocationForm.employee_email.trim();
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
  }, [benchAgingRows, allocations]);
  const selectedAllocationProjectType = useMemo(
    () =>
      resolveProjectTypeForProjectCode(allocationForm.project_code, {
        projects: hrProjectRawRows,
        allocationProjects,
      }),
    [allocationForm.project_code, hrProjectRawRows, allocationProjects]
  );
  const isStaffingProjectAllocation = isStaffingProjectTypeCode(selectedAllocationProjectType);
  useEffect(() => {
    const code = allocationForm.project_code.trim();
    if (!code) return;
    const pt = resolveProjectTypeForProjectCode(code, { projects: hrProjectRawRows, allocationProjects });
    setAllocationForm((prev) => {
      let next = prev;
      if (pt === "PRODUCT" && prev.billing_status !== "INVESTMENT") {
        next = { ...next, billing_status: "INVESTMENT" };
      }
      if (isStaffingProjectTypeCode(pt) && prev.allocation_type !== "STAFFING") {
        next = { ...next, allocation_type: "STAFFING" };
      }
      if (!isStaffingProjectTypeCode(pt) && prev.allocation_type === "STAFFING") {
        next = { ...next, allocation_type: "" };
      }
      return next;
    });
  }, [allocationForm.project_code, hrProjectRawRows, allocationProjects]);
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
  async function loadMyLeaveRequests() {
    const email = String((user as { email?: string } | null)?.email ?? "").trim();
    if (!email) {
      setMyLeaveRequests([]);
      return;
    }
    const today = new Date();
    const future = new Date(today);
    future.setFullYear(future.getFullYear() + 2);
    const from = "2000-01-01";
    const to = future.toISOString().slice(0, 10);
    const types = [
      ...REQUEST_TYPE_ALIASES.LEAVE,
      ...REQUEST_TYPE_ALIASES.WFH,
      ...REQUEST_TYPE_ALIASES.COMP_OFF,
    ] as const;
    let merged: Array<Record<string, unknown>> = [];
    const requestTs = Date.now();
    const responses = await Promise.allSettled(
      types.map((type) =>
        apiClient.get(endpoints.userRequest.getByEmployees(email, from, to, type), {
          query: { page: "0", size: "200", _ts: requestTs },
        })
      )
    );
    merged = responses
      .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled")
      .flatMap((r) => toPagedRows((r.value as { data?: unknown }).data ?? r.value));

    // If employee-specific endpoint yields nothing (or fails), fall back to range + filter.
    if (!merged.length) {
      const rangeResponses = await Promise.allSettled(
        types.map((type) =>
          apiClient.get(endpoints.userRequest.getRange(from, to, type), {
            query: { page: "0", size: "200", _ts: requestTs },
          })
        )
      );
      const rows = rangeResponses
        .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled")
        .flatMap((r) => toPagedRows((r.value as { data?: unknown }).data ?? r.value));
      merged = rows.filter((row) => {
        const rowEmail = String(
          row.email ??
            row.user_email ??
            row.userEmail ??
            row.emp_email ??
            row.empEmail ??
            row.employee_email ??
            row.employeeEmail ??
            row.requester_email ??
            row.requesterEmail ??
            row.requested_by_email ??
            row.requestedByEmail ??
            row.created_by_email ??
            row.createdByEmail ??
            row.requested_by ??
            row.requestedBy ??
            ""
        )
          .trim()
          .toLowerCase();
        return rowEmail === email.toLowerCase();
      });
    }
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
  const loadEmployeeRequestsForApprover = useCallback(async () => {
    const today = new Date();
    const future = new Date(today);
    future.setFullYear(future.getFullYear() + 2);
    const from = employeeRequestFilters.fromDate || `${today.getFullYear()}-01-01`;
    const to = employeeRequestFilters.toDate || future.toISOString().slice(0, 10);
    const requestType = employeeRequestFilters.requestType || "ALL";
    const requestTypes =
      requestType === "ALL"
        ? [
            ...REQUEST_TYPE_ALIASES.LEAVE,
            ...REQUEST_TYPE_ALIASES.WFH,
            ...REQUEST_TYPE_ALIASES.COMP_OFF,
          ]
        : REQUEST_TYPE_ALIASES[requestType] ?? [requestType];
    let onboardRows: Array<Record<string, unknown>> = [];
    let scopedManagerRows: Array<Record<string, unknown>> = [];
    if (hasHrAccess) {
      const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "200" });
      onboardRows = toPagedRows(onboardRes.data ?? onboardRes);
    } else if (hasManagerAccess) {
      if (managerPortfolioRows.length) {
        scopedManagerRows = managerPortfolioRows;
      } else {
        const loaded = await loadManagerData();
        scopedManagerRows = loaded.detailRows;
      }
    }
    const scopeRows = hasHrAccess ? onboardRows : scopedManagerRows;
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
    if (emailCsv) {
      try {
        const responses = await Promise.all(
          requestTypes.map((type) =>
            apiClient.get(endpoints.userRequest.getByEmployees(emailCsv, from, to, type), {
              query: { page: "0", size: "200" },
            })
          )
        );
        collectedRows.push(
          ...responses.flatMap((res) => toPagedRows((res as { data?: unknown }).data ?? res))
        );
      } catch {
        /* ignore and continue with range endpoint */
      }
    }
    if (hasHrAccess) {
      try {
        const rangeResponses = await Promise.all(
          requestTypes.map((type) =>
            apiClient.get(endpoints.userRequest.getRange(from, to, type), {
              query: { page: "0", size: "200" },
            })
          )
        );
        collectedRows.push(
          ...rangeResponses.flatMap((res) => toPagedRows((res as { data?: unknown }).data ?? res))
        );
      } catch {
        /* ignore if one source already succeeded */
      }
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
  }, [employeeRequestFilters, hasHrAccess, hasManagerAccess, managerPortfolioRows, loadManagerData]);  async function updateEmployeeRequestStatus(requestId: string, status: "APPROVED" | "REJECTED") {
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

  const buildAllocationDisplayContext = useCallback(async () => {
    const [onboardUsers, hrProjects] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: ALLOCATION_ONBOARD_DIRECTORY_QUERY_KEY,
        queryFn: fetchAllocationOnboardDirectory,
      }),
      queryClient.fetchQuery({
        queryKey: HR_PROJECTS_QUERY_KEY,
        queryFn: fetchHrProjects,
      }),
    ]);
    const projectRows = hrProjects.rawRows;
    const userIdToName = buildUserIdToNameMap(onboardUsers);
    const emailToName = buildEmailToNameMap(onboardUsers);
    const projectDisplayByCode = buildProjectCodeDisplayMap(projectRows);
    return { userIdToName, emailToName, projectDisplayByCode, onboardUsers };
  }, [queryClient]);

  const enrichAllocationRowsWithContext = useCallback(
    async (rows: Array<Record<string, unknown>>) => {
      const { userIdToName, emailToName, projectDisplayByCode } =
        await buildAllocationDisplayContext();
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
      return enrichAllocationRowsForDisplay(rows, {
        userIdToName,
        emailToName,
        projectDisplayByCode,
      });
    },
    [buildAllocationDisplayContext]
  );

  const loadAllocationsForHr = useCallback(async () => {
    setAllocationsLoading(true);
    setAllocationsLoadError(null);
    try {
      const [mainRes, deallocRes] = await Promise.all([
        hrmsService.getAllocations({
          page: ALLOCATION_LIST_PAGE,
          size: "200",
          view: "ALL",
          includeSuperseded: "true",
        }),
        hrmsService
          .getDeallocatedAllocations({ page: ALLOCATION_LIST_PAGE, size: "200" })
          .catch(() => null),
      ]);

      let mainRows = parseAllocationListRows((mainRes as { data?: unknown }).data ?? mainRes);
      if (!mainRows.length) {
        const fallback = await hrmsService.getAllocations({
          page: ALLOCATION_LIST_PAGE,
          size: "200",
          includeSuperseded: "true",
        });
        mainRows = parseAllocationListRows((fallback as { data?: unknown }).data ?? fallback);
      }

      const deallocRows = deallocRes
        ? parseDeallocatedAllocationListRows((deallocRes as { data?: unknown }).data ?? deallocRes)
        : [];

      const rows = mergeUniqueAllocationListRows([...mainRows, ...deallocRows]);
      setAllocations(await enrichAllocationRowsWithContext(rows));
    } catch (err) {
      setAllocations([]);
      setAllocationsLoadError(
        err instanceof Error ? err.message : "Could not load allocation records."
      );
    } finally {
      setAllocationsLoading(false);
    }
  }, [enrichAllocationRowsWithContext]);

  const loadEmployeeAllocationsForRow = useCallback(
    async (row: Record<string, unknown>) => {
      const employeeEmail = String(
        row.employee_email ?? row.employeeEmail ?? row.email ?? ""
      ).trim();
      const userIdRaw = row.user_id ?? row.userId;
      const userId =
        userIdRaw !== undefined && userIdRaw !== null && userIdRaw !== ""
          ? Number(userIdRaw)
          : undefined;
      const highlightedAllocationId = allocationRowId(row);

      if (!employeeEmail && !Number.isFinite(userId)) return;

      setEmployeeAllocationsLoading(true);
      setEmployeeAllocationsError(null);

      try {
        const res = await hrmsService.getEmployeeAllocations(
          employeeEmail
            ? { userEmail: employeeEmail, scope: "all" }
            : { userId: userId!, scope: "all" }
        );
        const parsed = parseEmployeeAllocationsResponse(res);
        if (!parsed) throw new Error("Could not load employee allocations.");
        const enriched = sortAllocationListForDisplay(
          await enrichAllocationRowsWithContext(parsed.allocations)
        );
        setSelectedEmployeeAllocations({
          employeeEmail: (parsed.employeeEmail || employeeEmail).toLowerCase(),
          employeeName:
            parsed.employeeName ||
            String(row.employee_name ?? row.employeeName ?? "Employee"),
          totalAllocatedPercent: parsed.totalAllocatedPercent,
          allocations: enriched,
          highlightedAllocationId,
        });
      } catch (err) {
        setSelectedEmployeeAllocations(null);
        setEmployeeAllocationsError(
          err instanceof Error ? err.message : "Could not load employee allocations."
        );
      } finally {
        setEmployeeAllocationsLoading(false);
      }
    },
    [enrichAllocationRowsWithContext]
  );

  const loadPickerEmployeeAllocations = useCallback(
    async (employeeEmail: string, employeeName: string) => {
      const normalizedEmail = employeeEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        setPickerEmployeeAllocations(null);
        setPickerEmployeeAllocationsError(null);
        return;
      }

      setPickerEmployeeAllocationsLoading(true);
      setPickerEmployeeAllocationsError(null);

      try {
        const res = await hrmsService.getEmployeeAllocations({
          userEmail: normalizedEmail,
          scope: "all",
        });
        const parsed = parseEmployeeAllocationsResponse(res);
        if (!parsed) throw new Error("Could not load employee allocations.");
        const enriched = sortAllocationListForDisplay(
          await enrichAllocationRowsWithContext(parsed.allocations)
        );
        setPickerEmployeeAllocations({
          employeeEmail: (parsed.employeeEmail || normalizedEmail).toLowerCase(),
          employeeName: parsed.employeeName || employeeName,
          totalAllocatedPercent: parsed.totalAllocatedPercent,
          allocations: enriched,
        });
      } catch (err) {
        setPickerEmployeeAllocations(null);
        setPickerEmployeeAllocationsError(
          err instanceof Error ? err.message : "Could not load employee allocations."
        );
      } finally {
        setPickerEmployeeAllocationsLoading(false);
      }
    },
    [enrichAllocationRowsWithContext]
  );

  useEffect(() => {
    const email = allocationForm.employee_email.trim().toLowerCase();
    if (!email || allocationHrSubTab !== "allocate") {
      if (!email) {
        setPickerEmployeeAllocations(null);
        setPickerEmployeeAllocationsError(null);
        setPickerEmployeeAllocationsLoading(false);
      }
      return;
    }
    const hit = allocationUsers.find((u) => u.email.toLowerCase() === email);
    void loadPickerEmployeeAllocations(email, hit?.name ?? allocationForm.employee_email.trim());
  }, [
    allocationForm.employee_email,
    allocationHrSubTab,
    allocationUsers,
    loadPickerEmployeeAllocations,
  ]);

  const commitAllocationForecastDays = useCallback(() => {
    const parsed = Number.parseInt(allocationForecastDaysInput.trim(), 10);
    const next =
      Number.isFinite(parsed) && parsed > 0 ? Math.min(365, parsed) : ALLOCATION_FORECAST_DAYS;
    setAllocationForecastDays(next);
    setAllocationForecastDaysInput(String(next));
  }, [allocationForecastDaysInput]);

  const loadAllocationForecasting = useCallback(async () => {
    setAllocationForecastLoading(true);
    setAllocationForecastLoadError(null);
    try {
      const forecastRes = await hrmsService.getAllocationForecasting({
        days: allocationForecastDays,
        page: Number(ALLOCATION_FORECAST_PAGE),
        size: Number(ALLOCATION_FORECAST_SIZE),
      });
      const rawRows = parseAllocationForecastRows(
        (forecastRes as { data?: unknown }).data ?? forecastRes
      );

      let onboardUsers: Array<Record<string, unknown>> = [];
      let projectRows: Array<Record<string, unknown>> = [];
      try {
        const [onboardResult, hrProjects] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ALLOCATION_ONBOARD_DIRECTORY_QUERY_KEY,
            queryFn: fetchAllocationOnboardDirectory,
          }),
          queryClient.fetchQuery({
            queryKey: HR_PROJECTS_QUERY_KEY,
            queryFn: fetchHrProjects,
          }),
        ]);
        onboardUsers = onboardResult;
        projectRows = hrProjects.rawRows;
      } catch {
        onboardUsers = [];
        projectRows = [];
      }

      const emailToName = buildEmailToNameMap(onboardUsers);
      const projectDisplayByCode = buildProjectCodeDisplayMap(projectRows);
      setAllocationForecastRows(
        normalizeForecastRows(rawRows, { emailToName, projectDisplayByCode })
      );
    } catch (err) {
      setAllocationForecastRows([]);
      setAllocationForecastLoadError(
        err instanceof Error ? err.message : "Could not load allocation forecasting."
      );
    } finally {
      setAllocationForecastLoading(false);
    }
  }, [queryClient, allocationForecastDays]);

  useEffect(() => {
    if (!user) return;
    if (!hasHrAccess || requiresSelfOnboarding) return;
    if (allocationHrSubTab !== "list") return;
    const id = window.setTimeout(() => {
      void loadAllocationsForHr();
      void loadAllocationForecasting();
    }, 0);
    return () => window.clearTimeout(id);
  }, [
    allocationHrSubTab,
    user,
    userRoles,
    hasHrAccess,
    requiresSelfOnboarding,
    loadAllocationsForHr,
    loadAllocationForecasting,
  ]);

  useEffect(() => {
    if (!hasHrAccess) return;
    const email =
      searchParams.get("employeeEmail")?.trim() ||
      searchParams.get("userEmail")?.trim() ||
      "";
    if (!email) {
      talentPoolPrefillHandled.current = null;
      return;
    }
    if (talentPoolPrefillHandled.current === email) return;
    talentPoolPrefillHandled.current = email;
    setAllocationForm((prev) => ({ ...prev, employee_email: email }));
    setAllocationHrSubTab("allocate");
    requestAnimationFrame(() => {
      allocationFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [hasHrAccess, searchParams]);

  const filteredProjects = useMemo(() => {
    const search = projectFilters.search.trim().toLowerCase();
    const filtered = hrProjectRawRows.filter((project) => {
      const typeOk =
        projectFilters.project_type === "ALL" ||
        projectTypeCodeFromRow(project as Record<string, unknown>) ===
          projectFilters.project_type;
      const searchOk =
        !search ||
        String(project.project_name ?? project.projectName ?? "")
          .toLowerCase()
          .includes(search);
      return typeOk && searchOk;
    });
    return applyListSort(filtered, projectSortId, PROJECT_SORT_OPTIONS);
  }, [hrProjectRawRows, projectFilters, projectSortId]);
  const projectPagination = useClientPagination(filteredProjects, {
    resetKeys: [projectFilters.search, projectFilters.project_type, projectSortId],
  });
  const filteredAllocations = useMemo(
    () => filterAllocationListBySearch(allocations, allocationListSearch),
    [allocations, allocationListSearch]
  );

  const sortedAllocations = useMemo(
    () => sortAllocationListForDisplay(filteredAllocations, allocationListSortId),
    [filteredAllocations, allocationListSortId]
  );

  const allocationPagination = useClientPagination(sortedAllocations, {
    resetKeys: [allocationListSearch, allocationListSortId],
  });
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
        const selected = teamTimelogEmailFilter.trim();
    if (!selected || selected.toUpperCase() === "ALL") return;
    void loadTimelogsForCurrentRole(selected).catch(() => {
      /* ignore focused refresh errors */
    });
  }, [ timelogSubTab, teamTimelogEmailFilter, loadTimelogsForCurrentRole]);
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
    // Workforce/utilization/attrition reports are not shown on the allocation page.
    return;
        const id = window.setTimeout(() => {
      void loadWorkforceOverviewReports().catch(() => {
        setHeadcountBreakdown([]);
        setRoleBillingRows([]);
        setExperienceBandRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [ hasHrAccess, loadWorkforceOverviewReports]);  useEffect(() => {
    return;
        const id = window.setTimeout(() => {
      void loadUtilizationReports().catch(() => {
        setUtilizationByDepartmentRows([]);
        setBenchAgingRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [ hasHrAccess, loadUtilizationReports]);  useEffect(() => {
    return;
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
  }, [ hasHrAccess, loadAttritionReports]);  useEffect(() => {
    return;
        const id = window.setTimeout(() => {
      void loadSkillInventoryReport().catch(() => {
        setSkillInventoryRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [ hasHrAccess, loadSkillInventoryReport]);  useEffect(() => {
    return;
        const id = window.setTimeout(() => {
      void loadContractDistributionReport().catch(() => {
        setContractDistributionRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [ hasHrAccess, loadContractDistributionReport]);  useEffect(() => {
    return;
        const id = window.setTimeout(() => {
      void loadBgvDashboardReport().catch(() => {
        setBgvDashboardRows([]);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [ hasHrAccess, loadBgvDashboardReport]);  useEffect(() => {
    // Offboarding/BGV employee pickers are not shown on the allocation page.
    return;
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
  }, [ hasHrAccess]);  useEffect(() => {
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
  }, [ hasHrAccess, bgvForm.emp_id]);  useEffect(() => {
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
  }, [ hasHrAccess]);
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
        <button
          type="button"
          className="btn-primary px-3 py-2"
          onClick={() =>
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
        </button>
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
        <button
          type="button"
          className="btn-primary px-4 py-2.5"
          onClick={openOwnProfileEditor}
          disabled={actionLoading}
        >
          Edit Profile
        </button>
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
        </button>
        <button
          type="button"
          className="btn-ghost ml-2 px-3 py-2"
          onClick={() => setIsEditingOwnProfile(false)}
          disabled={actionLoading}
        >
          Cancel
        </button>
      </div>
    </div>
  );


  return (
    <>
      <DashboardPageShell>
        <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
          <>
                          {hasHrAccess ? (
                            <section className="space-y-4">
                              <div className="flex flex-wrap gap-2 border-b border-wt-border pb-3">
                                <button
                                  type="button"
                                  onClick={() => setAllocationHrSubTab("project")}
                                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    allocationHrSubTab === "project"
                                      ? "bg-wt-surface-3 text-wt-text"
                                      : "text-wt-text-muted hover:bg-wt-surface-2"
                                  }`}
                                >
                                  Create Project
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAllocationHrSubTab("allocate")}
                                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    allocationHrSubTab === "allocate"
                                      ? "bg-wt-surface-3 text-wt-text"
                                      : "text-wt-text-muted hover:bg-wt-surface-2"
                                  }`}
                                >
                                  Project allocation
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAllocationHrSubTab("assign-pm")}
                                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    allocationHrSubTab === "assign-pm"
                                      ? "bg-wt-surface-3 text-wt-text"
                                      : "text-wt-text-muted hover:bg-wt-surface-2"
                                  }`}
                                >
                                  Assign Project Manager
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAllocationHrSubTab("list");
                                    void loadAllocationsForHr();
                                    void loadAllocationForecasting();
                                  }}
                                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    allocationHrSubTab === "list"
                                      ? "bg-wt-surface-3 text-wt-text"
                                      : "text-wt-text-muted hover:bg-wt-surface-2"
                                  }`}
                                >
                                  Allocation list
                                </button>
                              </div>
          
                              {allocationHrSubTab === "project" ? (
                              <div ref={projectCrudFormRef} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                                <h3 className="font-semibold">Create Project</h3>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  <InputField
                                    label="Project Name"
                                    required
                                    value={projectForm.project_name}
                                    onChange={(v) => setProjectForm((p) => ({ ...p, project_name: v }))}
                                  />
                                  <InputField
                                    label="Client name"
                                    value={projectForm.client_name}
                                    onChange={(v) => setProjectForm((p) => ({ ...p, client_name: v }))}
                                  />
                                  <AccountManagerSelect
                                    required
                                    value={projectForm.account_manager_email}
                                    onChange={(v) =>
                                      setProjectForm((p) => ({ ...p, account_manager_email: v }))
                                    }
                                  />
                                  <ProjectTypeSelect
                                    required
                                    activeOnly
                                    enabled={hasAllocationAccess}
                                    value={projectForm.project_type}
                                    onChange={(v) =>
                                      setProjectForm((p) => ({ ...p, project_type: v }))
                                    }
                                  />
                                  <InputField
                                    label="Start date"
                                    type="date"
                                    value={projectForm.start_date}
                                    onChange={(v) => setProjectForm((p) => ({ ...p, start_date: v }))}
                                  />
                                  <InputField
                                    label="End date"
                                    type="date"
                                    value={projectForm.end_date}
                                    onChange={(v) => setProjectForm((p) => ({ ...p, end_date: v }))}
                                  />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="btn-primary px-3 py-2"
                                    onClick={() =>
                                      runAction(
                                        editingProjectCode ? "Update Project" : "Create Project",
                                        async () => {
                                          const name = projectForm.project_name.trim();
                                          if (!name) {
                                            throw new Error("Project name is required.");
                                          }
                                          if (
                                            !projectForm.project_type ||
                                            !isKnownProjectTypeCode(
                                              projectForm.project_type,
                                              activeProjectTypes
                                            )
                                          ) {
                                            throw new Error("Please select a valid project type.");
                                          }
                                          const accountManagerEmail = normalizePickerEmail(
                                            projectForm.account_manager_email
                                          );
                                          if (!accountManagerEmail) {
                                            throw new Error("Account manager is required.");
                                          }
                                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountManagerEmail)) {
                                            throw new Error("Select a valid account manager email.");
                                          }
                                          const project_code = generateAutomaticProjectCode();
                                          const startDate = projectForm.start_date.trim();
                                          const endDate = projectForm.end_date.trim();
                                          if (startDate && endDate && startDate > endDate) {
                                            throw new Error("Start date must be on or before end date.");
                                          }
                                          await hrmsService.createProject({
                                            project_code,
                                            project_name: name,
                                            project_type: projectForm.project_type,
                                            client_name: projectForm.client_name.trim() || null,
                                            account_manager_email: accountManagerEmail,
                                            ...(startDate ? { start_date: startDate } : {}),
                                            ...(endDate ? { end_date: endDate } : {}),
                                          });
                                          setEditingProjectCode("");
                                          setProjectForm(createEmptyProjectForm());
                                          refreshHrProjects();
                                        }
                                      )
                                    }
                                    disabled={actionLoading}
                                  >
                                    {editingProjectCode ? "Save Project" : "Create Project"}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg p-2 text-wt-text-muted hover:bg-wt-surface-2 hover:text-wt-text"
                                    onClick={() =>
                                      runAction("Load projects", async () => {
                                        refreshHrProjects();
                                        setProjectFilters({ search: "", project_type: "ALL" });
                                      })
                                    }
                                    disabled={actionLoading}
                                    aria-label="Refresh projects"
                                    title="Refresh projects"
                                  >
                                    <IconRefresh />
                                  </button>
                                </div>
                                <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-3">
                                  <p className="text-sm font-medium">All Projects</p>
                                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <InputField
                                      label="Search by name"
                                      value={projectFilters.search}
                                      onChange={(v) =>
                                        setProjectFilters((p) => ({
                                          ...p,
                                          search: v,
                                        }))
                                      }
                                    />
                                    <ProjectTypeFilterSelect
                                      enabled={hasAllocationAccess}
                                      value={projectFilters.project_type}
                                      onChange={(v) =>
                                        setProjectFilters((p) => ({
                                          ...p,
                                          project_type: v,
                                        }))
                                      }
                                    />
                                  </div>
                                  {filteredProjects.length ? (
                                    <>
                                    <div className="wt-scroll-both max-h-[min(50vh,420px)] overflow-auto rounded-lg border border-wt-border">
                                      <table className="wt-scrollable-table text-sm">
                                        <thead className="wt-table-sticky-head text-wt-text-muted">
                                          <tr>
                                            <th className="px-3 py-2 text-left font-medium">
                                              <TableSortHeader
                                                label="Project name"
                                                activeDirection={activeSortDirectionForColumn(
                                                  "project_name",
                                                  projectSortId,
                                                  PROJECT_SORT_OPTIONS
                                                )}
                                                sortable
                                                onSort={() =>
                                                  setProjectSortId(
                                                    toggleColumnSort(
                                                      "project_name",
                                                      projectSortId,
                                                      PROJECT_SORT_OPTIONS
                                                    )
                                                  )
                                                }
                                              />
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">Type</th>
                                            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Start date</th>
                                            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">End date</th>
                                            <th className="px-3 py-2 text-right font-medium w-20">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {projectPagination.pageItems.map((row, idx) => {
                                            const code = String(row.project_code ?? row.projectCode ?? "").trim();
                                            const name = String(row.project_name ?? row.projectName ?? "");
                                            const typCode = projectTypeCodeFromRow(
                                              row as Record<string, unknown>
                                            );
                                            const typ = formatProjectTypeCode(typCode, projectTypeLabels);
                                            const startDate = formatApiDateDisplay(
                                              String(row.start_date ?? row.startDate ?? "")
                                            );
                                            const endDate = formatApiDateDisplay(
                                              String(row.end_date ?? row.endDate ?? "")
                                            );
                                            return (
                                              <tr key={code || String(idx)} className="border-t border-wt-border">
                                                <td className="px-3 py-2 max-w-[240px] truncate font-medium">{name || "—"}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{typ}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{startDate || "—"}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{endDate || "—"}</td>
                                                <td className="px-3 py-2 text-right">
                                                  <button
                                                    type="button"
                                                    className="rounded-lg p-2 text-wt-text-muted hover:bg-rose-500/10 hover:text-rose-600"
                                                    aria-label={`Delete project ${name || code}`}
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
                                    <ListPagination
                                      className="mt-3 px-1"
                                      page={projectPagination.page}
                                      totalPages={projectPagination.totalPages}
                                      totalItems={projectPagination.totalItems}
                                      rangeStart={projectPagination.rangeStart}
                                      rangeEnd={projectPagination.rangeEnd}
                                      pageSize={projectPagination.pageSize}
                                      pageSizeOptions={projectPagination.pageSizeOptions}
                                      onPageChange={projectPagination.setPage}
                                      onPageSizeChange={projectPagination.setPageSize}
                                    />
                                    </>
                                  ) : (
                                    <p className="text-sm text-wt-text-muted">No projects match current filters.</p>
                                  )}
                                </div>
                              </div>
                              ) : null}
          
                              {allocationHrSubTab === "allocate" ? (
                              <>
                              <div ref={allocationFormRef} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                                <h3 className="font-semibold">Employee Allocation Form</h3>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div
                                    ref={allocationEmployeeComboboxRef}
                                    className="relative text-xs text-wt-text-muted flex flex-col gap-1"
                                  >
                                    <span className="block">
                                      <FieldLabel label="Employee" required />
                                    </span>
                                    <button
                                      type="button"
                                      className="input-field flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-wt-text"
                                      aria-expanded={allocationEmployeePickerOpen}
                                      aria-haspopup="listbox"
                                      onClick={() => {
                                        setAllocationEmployeePickerOpen((open) => {
                                          const next = !open;
                                          if (next) setAllocationEmployeePickerQuery("");
                                          return next;
                                        });
                                      }}
                                    >
                                      <span className="min-w-0 truncate">{allocationEmployeeSelectLabel}</span>
                                      <span className="shrink-0 text-wt-text-muted" aria-hidden>
                                        ▾
                                      </span>
                                    </button>
                                    {allocationEmployeePickerOpen ? (
                                      <div
                                        className="absolute left-0 right-0 top-full z-50 mt-1 space-y-2 rounded-xl border border-wt-border bg-wt-surface-1 p-2 shadow-lg"
                                        role="listbox"
                                        aria-label="Employees"
                                      >
                                        <input
                                          type="search"
                                          className="input-field w-full px-3 py-2 text-sm"
                                          placeholder="Search employees…"
                                          value={allocationEmployeePickerQuery}
                                          onChange={(e) => setAllocationEmployeePickerQuery(e.target.value)}
                                          autoComplete="off"
                                          autoFocus
                                        />
                                        <div className="max-h-52 overflow-auto rounded-lg border border-wt-border">
                                          <button
                                            type="button"
                                            className="block w-full px-3 py-2 text-left text-sm text-wt-text-muted hover:bg-wt-surface-2"
                                            onClick={() => {
                                              setAllocationForm((p) => ({ ...p, employee_email: "" }));
                                              setPickerEmployeeAllocations(null);
                                              setPickerEmployeeAllocationsError(null);
                                              setAllocationEmployeePickerOpen(false);
                                              setAllocationEmployeePickerQuery("");
                                            }}
                                          >
                                            Clear selection
                                          </button>
                                          {allocationEmployeesPickerFiltered.length ? (
                                            allocationEmployeesPickerFiltered.map((u) => (
                                              <button
                                                key={u.email}
                                                type="button"
                                                role="option"
                                                className={`block w-full border-t border-wt-border px-3 py-2 text-left text-sm hover:bg-wt-surface-2 ${
                                                  allocationForm.employee_email === u.email
                                                    ? "bg-indigo-500/10 font-medium"
                                                    : ""
                                                }`}
                                                onClick={() => {
                                                  setAllocationForm((p) => ({ ...p, employee_email: u.email }));
                                                  setAllocationEmployeePickerOpen(false);
                                                  setAllocationEmployeePickerQuery("");
                                                }}
                                              >
                                                {u.name}
                                              </button>
                                            ))
                                          ) : (
                                            <p className="px-3 py-4 text-center text-sm text-wt-text-muted">
                                              No employees match your search.
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                  <SelectField
                                    label="Project"
                                    required
                                    value={allocationForm.project_code}
                                    placeholder="Select project"
                                    options={allocationProjects.map((p) => ({
                                      value: p.code,
                                      label: p.name,
                                    }))}
                                    onChange={(project_code) =>
                                      setAllocationForm((p) => ({
                                        ...p,
                                        project_code,
                                      }))
                                    }
                                  />
                                  <SelectField
                                    label="Project Role"
                                    required
                                    value={allocationForm.role}
                                    placeholder="Select project role"
                                    options={allocationRoles}
                                    onChange={(role) =>
                                      setAllocationForm((p) => ({
                                        ...p,
                                        role,
                                      }))
                                    }
                                  />
                                  <AllocatedPercentSelect
                                    required
                                    designation={allocationForm.role}
                                    enabled={hasAllocationAccess}
                                    value={allocationForm.allocated_percent}
                                    onChange={(v) =>
                                      setAllocationForm((p) => ({ ...p, allocated_percent: v }))
                                    }
                                  />
                                  <SelectField
                                    label="Allocation Type"
                                    placeholder={
                                      isStaffingProjectAllocation
                                        ? "Staffing (required for staffing projects)"
                                        : "Select allocation type"
                                    }
                                    required
                                    value={
                                      isStaffingProjectAllocation
                                        ? "STAFFING"
                                        : allocationForm.allocation_type
                                    }
                                    options={
                                      isStaffingProjectAllocation
                                        ? [{ value: "STAFFING", label: "Staffing" }]
                                        : ["DEPLOYABLE", "STAFFING", "LOCKED"]
                                    }
                                    disabled={isStaffingProjectAllocation}
                                    onChange={(v) =>
                                      setAllocationForm((p) => ({ ...p, allocation_type: v }))
                                    }
                                  />
                                  <SelectField
                                    label="Billing Status"
                                    placeholder="Select billing status"
                                    required
                                    value={allocationForm.billing_status}
                                    options={["BILLED", "BUFFER", "INVESTMENT"]}
                                    onChange={(v) =>
                                      setAllocationForm((p) => ({
                                        ...p,
                                        billing_status:
                                          v === "BILLED" || v === "BUFFER" || v === "INVESTMENT"
                                            ? v
                                            : "",
                                      }))
                                    }
                                  />
                                  <InputField label="Start Date" required value={allocationForm.start_date} onChange={(v) => setAllocationForm((p) => ({ ...p, start_date: v }))} type="date" />
                                  <InputField label="End Date" value={allocationForm.end_date} onChange={(v) => setAllocationForm((p) => ({ ...p, end_date: v }))} type="date" />
                                </div>
                                {allocationForm.employee_email.trim() ? (
                                  <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-medium">
                                        {allocationEmployeeSelectLabel} — current &amp; future allocations
                                      </p>
                                      {pickerEmployeeAllocations ? (
                                        <p className="text-xs text-wt-text-muted">
                                          Total allocated: {pickerEmployeeAllocations.totalAllocatedPercent}%
                                        </p>
                                      ) : null}
                                    </div>
                                    {pickerEmployeeAllocationsLoading ? (
                                      <SectionLoading label="Loading allocations…" />
                                    ) : null}
                                    {pickerEmployeeAllocationsError ? (
                                      <p className="text-sm text-rose-700">{pickerEmployeeAllocationsError}</p>
                                    ) : null}
                                    {!pickerEmployeeAllocationsLoading &&
                                    !pickerEmployeeAllocationsError &&
                                    pickerEmployeeAllocations &&
                                    pickerEmployeeAllocations.allocations.length === 0 ? (
                                      <p className="text-sm text-wt-text-muted">
                                        No current or future allocations for this employee.
                                      </p>
                                    ) : null}
                                    {!pickerEmployeeAllocationsLoading &&
                                    pickerEmployeeAllocations &&
                                    pickerEmployeeAllocations.allocations.length > 0 ? (
                                      <div className="wt-scroll-both max-h-[min(40vh,280px)] overflow-auto rounded-xl border border-wt-border">
                                        <table className="wt-scrollable-table text-sm">
                                          <thead className="wt-table-sticky-head text-wt-text-muted">
                                            <tr>
                                              <th className="text-left px-3 py-2 font-medium">Project</th>
                                              <th className="text-left px-3 py-2 font-medium">Allocation %</th>
                                              <th className="text-left px-3 py-2 font-medium">Start date</th>
                                              <th className="text-left px-3 py-2 font-medium">End date</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {pickerEmployeeAllocations.allocations.map((row, idx) => (
                                              <tr
                                                key={`${allocationRowId(row) || "picker-alloc"}-${idx}`}
                                                className="border-t border-wt-border"
                                              >
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                  {allocationProjectDisplayName(row)}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                  {formatAllocatedPercentDisplay(row, allocationPercentLabels)}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                  {formatApiDateDisplay(
                                                    (row.start_date ?? row.startDate) as string | null | undefined
                                                  ) || "—"}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                  {formatApiDateDisplay(
                                                    (row.end_date ?? row.endDate) as string | null | undefined
                                                  ) || "—"}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="btn-primary px-3 py-2"
                                    onClick={() =>
                                      runAction(editingAllocationId ? "Update allocation" : "Create allocation", async () => {
                                        const employeeEmail = allocationForm.employee_email.trim();
                                        const projectCode = allocationForm.project_code.trim();
                                        const role = allocationForm.role.trim();
                                        if (!employeeEmail) throw new Error("Please select an employee.");
                                        if (!projectCode) throw new Error("Please select a project.");
                                        if (!role) throw new Error("Please select a project role.");
                                        if (
                                          !allocationForm.allocated_percent ||
                                          !isValidAllocationPercentForDesignation(
                                            allocationForm.allocated_percent,
                                            role,
                                            allocationPercentOptions
                                          )
                                        ) {
                                          throw new Error("Please select a valid allocation %.");
                                        }
                                        if (!allocationForm.allocation_type) {
                                          throw new Error("Please select allocation type.");
                                        }
                                        if (!allocationForm.billing_status) {
                                          throw new Error("Please select billing status.");
                                        }
                                        const startDate = normalizeToApiDate(allocationForm.start_date);
                                        if (!startDate) {
                                          throw new Error("Start date is required.");
                                        }
                                        const endDate = allocationForm.end_date
                                          ? normalizeToApiDate(allocationForm.end_date)
                                          : null;
                                        const payload = {
                                          employeeEmail,
                                          projectCode,
                                          role: role || null,
                                          allocatedPercent: Number(allocationForm.allocated_percent),
                                          startDate,
                                          endDate,
                                          allocationType: isStaffingProjectAllocation
                                            ? "STAFFING"
                                            : allocationForm.allocation_type,
                                          billingStatus: allocationForm.billing_status,
                                        };
                                        const savedEditingId = editingAllocationId;
                                        if (savedEditingId) {
                                          const updateRes = await hrmsService.updateAllocation(
                                            savedEditingId,
                                            payload
                                          );
                                          const supersede = parseAllocationUpdateResponse(updateRes);
                                          if (supersede) {
                                            setAllocations((prev) =>
                                              sortAllocationListRows(
                                                mergeAllocationListAfterUpdate(
                                                  prev,
                                                  supersede,
                                                  savedEditingId
                                                )
                                              )
                                            );
                                          }
                                        } else {
                                          await hrmsService.createAllocation(payload);
                                          setPmAssignPrefill({
                                            projectCode,
                                            userEmail: employeeEmail,
                                          });
                                        }
                                        setAllocationForm(createEmptyAllocationForm());
                                        setEditingAllocationId("");
                                        void queryClient.invalidateQueries({
                                          queryKey: TALENT_POOL_QUERY_KEY,
                                        });
                                        await loadAllocationsForHr();
                                        if (!savedEditingId) {
                                          setAllocationHrSubTab("assign-pm");
                                        } else {
                                          setAllocationHrSubTab("list");
                                        }
                                      })
                                    }
                                    disabled={actionLoading}
                                  >
                                    {editingAllocationId ? "Save Allocation" : "Allocate Employee"}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg p-2 text-wt-text-muted hover:bg-wt-surface-2 hover:text-wt-text"
                                    onClick={() =>
                                      runAction("Load allocations", async () => {
                                        await loadAllocationsForHr();
                                        setAllocationHrSubTab("list");
                                        requestAnimationFrame(() => {
                                          allocationRecordsRef.current?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                          });
                                        });
                                      })
                                    }
                                    disabled={actionLoading}
                                    aria-label="Refresh allocations"
                                    title="Refresh allocations"
                                  >
                                    <IconRefresh />
                                  </button>
                                </div>
                              </div>
                              </>
                              ) : null}

                              {allocationHrSubTab === "assign-pm" ? (
                                <AssignProjectManagerPanel
                                  projects={allocationProjects}
                                  actionLoading={actionLoading}
                                  runAction={runAction}
                                  prefill={pmAssignPrefill ?? undefined}
                                />
                              ) : null}
          
                              {allocationHrSubTab === "list" ? (
                                <>
                                <div
                                  ref={allocationRecordsRef}
                                  className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-medium">Allocation records</p>
                                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px] justify-end">
                                      <label className="sr-only" htmlFor="allocation-list-search">
                                        Search allocations
                                      </label>
                                      <input
                                        id="allocation-list-search"
                                        type="search"
                                        className="input-field min-w-[200px] flex-1 max-w-md px-3 py-1.5 text-sm"
                                        placeholder="Search project, employee, role, type, billing…"
                                        value={allocationListSearch}
                                        onChange={(e) => setAllocationListSearch(e.target.value)}
                                        aria-label="Search allocations"
                                      />
                                      <button
                                        type="button"
                                        className="rounded-lg border border-wt-border bg-wt-surface-1 px-2.5 py-1 text-xs text-wt-text hover:bg-wt-surface-3 disabled:opacity-50"
                                        disabled={allocationsLoading || actionLoading}
                                        onClick={() => void loadAllocationsForHr()}
                                      >
                                        Refresh
                                      </button>
                                    </div>
                                  </div>
                                  {allocationsLoadError ? (
                                    <p className="text-sm text-rose-700">{allocationsLoadError}</p>
                                  ) : null}
                                  {allocationsLoading && !allocations.length ? (
                                    <SectionLoading label="Loading allocations…" />
                                  ) : sortedAllocations.length ? (
                                    <>
                                    <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
                                      <table className="wt-scrollable-table text-sm">
                                        <thead className="wt-table-sticky-head text-wt-text-muted">
                                          <tr>
                                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                              <TableSortHeader
                                                label="ALLOCATED PROJECT"
                                                activeDirection={activeSortDirectionForColumn(
                                                  "allocated_project",
                                                  allocationListSortId,
                                                  ALLOCATION_LIST_SORT_OPTIONS
                                                )}
                                                sortable
                                                onSort={() =>
                                                  setAllocationListSortId(
                                                    toggleColumnSort(
                                                      "allocated_project",
                                                      allocationListSortId,
                                                      ALLOCATION_LIST_SORT_OPTIONS
                                                    )
                                                  )
                                                }
                                              />
                                            </th>
                                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">EMPLOYEE NAME</th>
                                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">PROJECT ROLE</th>
                                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                              ALLOCATION %
                                            </th>
                                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                              <TableSortHeader
                                                label="ALLOCATION TYPE"
                                                activeDirection={activeSortDirectionForColumn(
                                                  "allocation_type",
                                                  allocationListSortId,
                                                  ALLOCATION_LIST_SORT_OPTIONS
                                                )}
                                                sortable
                                                onSort={() =>
                                                  setAllocationListSortId(
                                                    toggleColumnSort(
                                                      "allocation_type",
                                                      allocationListSortId,
                                                      ALLOCATION_LIST_SORT_OPTIONS
                                                    )
                                                  )
                                                }
                                              />
                                            </th>
                                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                              <TableSortHeader
                                                label="BILLING STATUS"
                                                activeDirection={activeSortDirectionForColumn(
                                                  "billing_status",
                                                  allocationListSortId,
                                                  ALLOCATION_LIST_SORT_OPTIONS
                                                )}
                                                sortable
                                                onSort={() =>
                                                  setAllocationListSortId(
                                                    toggleColumnSort(
                                                      "billing_status",
                                                      allocationListSortId,
                                                      ALLOCATION_LIST_SORT_OPTIONS
                                                    )
                                                  )
                                                }
                                              />
                                            </th>
                                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">START DATE</th>
                                            <th className="text-left px-3 py-2 font-medium whitespace-nowrap">END DATE</th>
                                            <th className="text-right px-3 py-2 font-medium whitespace-nowrap">ACTIONS</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {allocationPagination.pageItems.map((row, idx) => {
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
                                            const allocatedPercentCode = resolveAllocatedPercentFromRow(
                                              row as Record<string, unknown>
                                            );
                                            const startDate = String(row.start_date ?? row.startDate ?? "").trim();
                                            const endDate = String(row.end_date ?? row.endDate ?? "").trim();
                                            const allocationType = String(
                                              row.allocation_type ?? row.allocationType ?? "DEPLOYABLE"
                                            ).trim();
                                            const billingStatus = String(
                                              row.billing_status ?? row.billingStatus ?? "BILLED"
                                            ).trim();
                                            const superseded = isSupersededAllocationRow(row);
                                            const editable = isEditableAllocationRow(row);
                                            const isSelectedEmployee =
                                              Boolean(employeeEmail) &&
                                              selectedEmployeeAllocations?.employeeEmail ===
                                                employeeEmail.toLowerCase();
                                            const isHighlightedRow =
                                              isSelectedEmployee &&
                                              selectedEmployeeAllocations?.highlightedAllocationId ===
                                                allocationId;
                                            return (
                                              <tr
                                                key={`${allocationId || "alloc"}-${idx}`}
                                                role="button"
                                                tabIndex={0}
                                                className={`border-t border-wt-border cursor-pointer transition hover:bg-wt-surface-1/80 ${
                                                  superseded
                                                    ? "bg-wt-surface-2/60 text-wt-text-muted opacity-75"
                                                    : ""
                                                } ${
                                                  isHighlightedRow
                                                    ? "bg-indigo-500/10"
                                                    : isSelectedEmployee
                                                      ? "bg-indigo-500/5"
                                                      : ""
                                                }`}
                                                onClick={() => void loadEmployeeAllocationsForRow(row)}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    void loadEmployeeAllocationsForRow(row);
                                                  }
                                                }}
                                              >
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                  {allocationProjectDisplayName(row)}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">{String(row.employee_name ?? "—")}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{String(row.role ?? "—")}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                  {formatAllocatedPercentDisplay(
                                                    row as Record<string, unknown>,
                                                    allocationPercentLabels
                                                  )}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">{String(row.allocation_type ?? "—")}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{String(row.billing_status ?? row.billingStatus ?? "—")}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{String(row.start_date ?? "—")}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{String(row.end_date ?? "—")}</td>
                                                <td className="px-3 py-2 text-right">
                                                  <div className="inline-flex items-center justify-end gap-1">
                                                    <button
                                                      type="button"
                                                      className="btn-action-icon disabled:opacity-40 disabled:pointer-events-none"
                                                      aria-label={`Edit allocation ${allocationId || idx}`}
                                                      title={
                                                        editable
                                                          ? "Edit allocation"
                                                          : "Superseded — edit the active row"
                                                      }
                                                      disabled={actionLoading || !editable}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAllocationForm((prev) => ({
                                                          ...prev,
                                                          allocation_id: allocationId,
                                                          employee_email: employeeEmail,
                                                          project_code: projectCode,
                                                          role,
                                                          allocated_percent:
                                                            allocatedPercentCode != null
                                                              ? String(allocatedPercentCode)
                                                              : "",
                                                          start_date: startDate,
                                                          end_date: endDate,
                                                          allocation_type: (() => {
                                                            const pt = resolveProjectTypeForProjectCode(
                                                              projectCode,
                                                              { projects: hrProjectRawRows, allocationProjects }
                                                            );
                                                            if (isStaffingProjectTypeCode(pt)) {
                                                              return "STAFFING";
                                                            }
                                                            const upper = allocationType.toUpperCase();
                                                            return ["DEPLOYABLE", "STAFFING", "LOCKED"].includes(
                                                              upper
                                                            )
                                                              ? upper
                                                              : "DEPLOYABLE";
                                                          })(),
                                                          billing_status:
                                                            ["BILLED", "BUFFER", "INVESTMENT"].includes(
                                                              billingStatus.toUpperCase()
                                                            )
                                                              ? (billingStatus.toUpperCase() as "BILLED" | "BUFFER" | "INVESTMENT")
                                                              : "BILLED",
                                                        }));
                                                        setEditingAllocationId(allocationId);
                                                        setAllocationHrSubTab("allocate");
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
                                                      className="rounded-lg p-2 text-wt-text-muted hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 disabled:pointer-events-none"
                                                      aria-label={`Deallocate ${allocationId || idx}`}
                                                      title={
                                                        editable
                                                          ? "Deallocate from project"
                                                          : "Superseded row cannot be deallocated here"
                                                      }
                                                      disabled={actionLoading || !allocationId || !editable}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        runAction("Deallocate", async () => {
                                                          await hrmsService.deleteAllocation(
                                                            allocationId
                                                          );
                                                          setAllocations((prev) =>
                                                            prev.filter(
                                                              (r) =>
                                                                allocationRowId(r) !== allocationId
                                                            )
                                                          );
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
                                    <ListPagination
                                      className="mt-3 px-1"
                                      page={allocationPagination.page}
                                      totalPages={allocationPagination.totalPages}
                                      totalItems={allocationPagination.totalItems}
                                      rangeStart={allocationPagination.rangeStart}
                                      rangeEnd={allocationPagination.rangeEnd}
                                      pageSize={allocationPagination.pageSize}
                                      pageSizeOptions={allocationPagination.pageSizeOptions}
                                      onPageChange={allocationPagination.setPage}
                                      onPageSizeChange={allocationPagination.setPageSize}
                                    />
                                    {employeeAllocationsLoading ? (
                                      <p className="mt-3 text-sm text-wt-text-muted">
                                        Loading employee allocations…
                                      </p>
                                    ) : null}
                                    {employeeAllocationsError ? (
                                      <p className="mt-3 text-sm text-rose-700">
                                        {employeeAllocationsError}
                                      </p>
                                    ) : null}
                                    {selectedEmployeeAllocations ? (
                                      <div className="mt-4 rounded-xl border border-wt-border bg-wt-surface-1 p-3 space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <p className="text-sm font-medium">
                                            {selectedEmployeeAllocations.employeeName} — current &amp;
                                            past allocations
                                          </p>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-xs text-wt-text-muted">
                                              Total allocated:{" "}
                                              {selectedEmployeeAllocations.totalAllocatedPercent}%
                                            </p>
                                            <button
                                              type="button"
                                              className="rounded-lg border border-wt-border bg-wt-surface-2 px-2.5 py-1 text-xs text-wt-text hover:bg-wt-surface-3"
                                              onClick={() => {
                                                setSelectedEmployeeAllocations(null);
                                                setEmployeeAllocationsError(null);
                                              }}
                                            >
                                              Close
                                            </button>
                                          </div>
                                        </div>
                                        <div className="wt-scroll-both max-h-[min(50vh,360px)] rounded-xl border border-wt-border">
                                          <table className="wt-scrollable-table text-sm">
                                            <thead className="wt-table-sticky-head text-wt-text-muted">
                                              <tr>
                                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                                  ALLOCATED PROJECT
                                                </th>
                                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                                  PROJECT ROLE
                                                </th>
                                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                                  ALLOCATION %
                                                </th>
                                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                                  ALLOCATION TYPE
                                                </th>
                                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                                  BILLING STATUS
                                                </th>
                                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                                  START DATE
                                                </th>
                                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                                  END DATE
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {selectedEmployeeAllocations.allocations.map(
                                                (detailRow, detailIdx) => {
                                                  const detailId = allocationRowId(detailRow);
                                                  const highlighted =
                                                    detailId &&
                                                    detailId ===
                                                      selectedEmployeeAllocations.highlightedAllocationId;
                                                  return (
                                                    <tr
                                                      key={`${detailId || "emp-alloc"}-${detailIdx}`}
                                                      className={`border-t border-wt-border ${
                                                        highlighted ? "bg-indigo-500/10 font-medium" : ""
                                                      }`}
                                                    >
                                                      <td className="px-3 py-2 whitespace-nowrap">
                                                        {allocationProjectDisplayName(detailRow)}
                                                      </td>
                                                      <td className="px-3 py-2 whitespace-nowrap">
                                                        {String(detailRow.role ?? "—")}
                                                      </td>
                                                      <td className="px-3 py-2 whitespace-nowrap">
                                                        {formatAllocatedPercentDisplay(
                                                          detailRow,
                                                          allocationPercentLabels
                                                        )}
                                                      </td>
                                                      <td className="px-3 py-2 whitespace-nowrap">
                                                        {String(detailRow.allocation_type ?? "—")}
                                                      </td>
                                                      <td className="px-3 py-2 whitespace-nowrap">
                                                        {String(
                                                          detailRow.billing_status ??
                                                            detailRow.billingStatus ??
                                                            "—"
                                                        )}
                                                      </td>
                                                      <td className="px-3 py-2 whitespace-nowrap">
                                                        {String(detailRow.start_date ?? "—")}
                                                      </td>
                                                      <td className="px-3 py-2 whitespace-nowrap">
                                                        {String(detailRow.end_date ?? "—")}
                                                      </td>
                                                    </tr>
                                                  );
                                                }
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    ) : null}
                                    </>
                                  ) : allocations.length ? (
                                    <p className="text-sm text-wt-text-muted">
                                      No allocations match your search.
                                    </p>
                                  ) : (
                                    <p className="text-sm text-wt-text-muted">
                                      {allocationsLoadError
                                        ? "Allocation list could not be loaded."
                                        : "No allocations found. Create one under Project allocation, then refresh."}
                                    </p>
                                  )}
                                </div>

                                <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-3">
                                  {allocationForecastLoadError ? (
                                    <p className="text-sm text-rose-700">{allocationForecastLoadError}</p>
                                  ) : null}
                                  <div className="flex flex-wrap items-end justify-between gap-3">
                                    <p className="text-sm font-medium">
                                      Allocation Forecasting (next {allocationForecastDays} days)
                                    </p>
                                    <label className="flex w-full sm:w-44 flex-col gap-1 text-xs text-wt-text-muted">
                                      <FieldLabel label="Allocations ending within" />
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min={1}
                                          max={365}
                                          className="input-field w-full px-3 py-2 text-sm"
                                          value={allocationForecastDaysInput}
                                          onChange={(e) => setAllocationForecastDaysInput(e.target.value)}
                                          onBlur={commitAllocationForecastDays}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.currentTarget.blur();
                                            }
                                          }}
                                          disabled={allocationForecastLoading}
                                          aria-label="Allocations ending within days"
                                        />
                                        <span className="shrink-0 text-sm text-wt-text-muted">days</span>
                                      </div>
                                    </label>
                                  </div>
                                  {allocationForecastLoading && !allocationForecastRows.length ? (
                                    <SectionLoading label="Loading forecasting…" />
                                  ) : (
                                    <DataTable
                                      columns={["project_name", "employee_name", "billing_status", "role"]}
                                      rows={allocationForecastRows}
                                      emptyLabel={
                                        allocationForecastLoadError
                                          ? "Allocation forecasting could not be loaded."
                                          : `No employees with allocations ending in the next ${allocationForecastDays} days.`
                                      }
                                      sortOptions={ALLOCATION_FORECAST_SORT_OPTIONS}
                                      resetPaginationKeys={[allocationForecastDays]}
                                    />
                                  )}
                                </div>
                                </>
                              ) : null}
                            </section>
                          ) : (
                            <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                              <p className="text-sm text-wt-text-muted">
                                Allocation management is available for HR/Admin. Use Allocation &amp; Projects to manage assignments.
                              </p>
                            </section>
                          )}
                        </>
        </OnboardingGate>
      </DashboardPageShell>
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
    </>
  );
}
