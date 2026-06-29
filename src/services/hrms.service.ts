import { endpoints } from "@/api/endpoints";
import { apiClient, type ApiEnvelope } from "@/api/httpClient";
import { parseAllocationExtensionListResponse } from "@/utils/allocationExtension";
import type { OnboardListData, OnboardListItem, OnboardUserResponse } from "@/types/onboard";
import type { OffboardListData, OffboardListQuery } from "@/types/offboard";
import { toPagedRows } from "@/utils/apiRows";
import { parseAllocationListRows } from "@/utils/allocationList";
import {
  ONBOARD_DATE_FIELDS,
  applyApiDateFields,
  applyApiDateQuery,
  toApiDateParam,
} from "@/utils/apiDate";

export type { OnboardListData, OnboardListItem, OnboardUserResponse } from "@/types/onboard";

/** @deprecated Use OnboardListItem — kept for existing imports. */
export type OnboardItem = OnboardListItem;

export interface PagedData<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface EmployeeLeaveBalanceBreakdown {
  primary: number;
  secondary: number;
  carry_forward: number;
  total: number;
}

export interface EmployeeLeaveBalancesData {
  emp_id: string;
  leave: EmployeeLeaveBalanceBreakdown;
  comp_off_balance: number;
}

export interface LeaveBalancesListItem {
  emp_id: string;
  leave: EmployeeLeaveBalanceBreakdown;
  comp_off_balance: number;
  employee_name?: string;
  email?: string;
}

export interface LeaveBalancesListData {
  current_page: number;
  total_pages: number;
  page_size: number;
  total_elements: number;
  year: number;
  month: number;
  items: LeaveBalancesListItem[];
}

export interface ManagerTeamOnLeaveRow {
  employee_email?: string;
  employee_name?: string;
  project_code?: string;
  project_name?: string;
  leave_date?: string;
}

export interface InvitedUsersQuery {
  fromDate?: string;
  toDate?: string;
  page?: string;
  size?: string;
}

export interface InvitedUsersListData {
  from_date: string;
  to_date: string;
  items: OnboardItem[];
  total: number;
  page: number;
  size: number;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type AllocationExtensionRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApiPage<T> {
  current_page: number;
  total_pages: number;
  page_size: number;
  total_elements: number;
  data: T[];
}

/** GET /allocation/active-non-bench — active non-bench allocations (paginated). */
export interface ActiveNonBenchAllocationsPage {
  current_page: number;
  total_pages: number;
  page_size: number;
  total_elements: number;
  allocations: unknown[];
}

export interface LeaveManagerOption {
  employeeId: string | null;
  employee_id?: string | null;
  email: string;
  name: string;
  /** @deprecated Legacy project-allocated manager options */
  project_code?: string | null;
  project_name?: string | null;
}

export interface LeaveRecipientOption {
  email: string;
  name: string;
  emp_id?: string | null;
}

export interface AllocationExtensionRequestRow {
  id: number;
  employee_name: string;
  employee_email: string;
  project_code: string;
  project_name: string;
  current_end_date: string | null;
  requested_end_date: string;
  extension_days: number | null;
  current_allocated_percent: number;
  requested_allocated_percent: number;
  reason: string | null;
  requested_by_name: string;
  status: AllocationExtensionRequestStatus;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AnnualCalendarItem {
  id: number;
  year: number;
  title: string;
  document_link: string | null;
  created_by_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface HolidayCalendarItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  holiday_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface HolidayCalendarDetail extends HolidayCalendarItem {
  holidays: Array<{
    id: number;
    holiday_date: string;
    name: string;
    is_optional: boolean;
  }>;
}

export interface CsvImportResult {
  processed: number;
  skipped: number;
  errors?: string[];
}

export const hrmsService = {
  getOnboardList(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<OnboardListData>>(endpoints.user.onboard, {
      query: params,
    });
  },

  /** GET /user/offboard — paginated list of offboarded employees. */
  getOffboardList(params: OffboardListQuery = {}) {
    const query: Record<string, string> = {};
    if (params.page != null) query.page = String(params.page);
    if (params.size != null) query.size = String(params.size);
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.type?.trim()) query.type = params.type.trim();
    if (params.fromDate?.trim()) query.fromDate = params.fromDate.trim();
    if (params.toDate?.trim()) query.toDate = params.toDate.trim();
    return apiClient.get<ApiEnvelope<OffboardListData>>(endpoints.user.offboardList, {
      query: applyApiDateQuery(query, ["fromDate", "toDate"]),
    });
  },

  /** GET /user/invited — invited employees in a date range (default last 7 days on backend). */
  getInvitedUsers(params: InvitedUsersQuery) {
    const query: Record<string, string> = {};
    if (params.fromDate?.trim()) query.fromDate = params.fromDate.trim();
    if (params.toDate?.trim()) query.toDate = params.toDate.trim();
    if (params.page != null) query.page = String(params.page);
    if (params.size != null) query.size = String(params.size);
    return apiClient.get<ApiEnvelope<InvitedUsersListData>>(endpoints.user.invited, {
      query: applyApiDateQuery(query, ["fromDate", "toDate"]),
    });
  },

  /** GET /user?email= or empId= — contract: fetch user profile */
  getUser(params: { email?: string; empId?: string }) {
    const query: Record<string, string> = {};
    const email = params.email?.trim();
    const empId = params.empId?.trim();
    if (email) query.email = email;
    if (empId) query.empId = empId;
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.user.lookup, { query });
  },

  createOnboard(payload: Record<string, unknown>) {
    const body = applyApiDateFields(payload, ONBOARD_DATE_FIELDS);
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.user.onboard, {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  /** POST /user/onboard/resend-invite — INVITED or ONBOARDING users only. */
  resendOnboardInvite(payload: { email: string }) {
    const email = payload.email.trim().toLowerCase();
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.user.resendOnboardInvite, {
      contentType: "application/json",
      body: JSON.stringify({ email }),
    });
  },

  completeMyOnboarding(formData: FormData) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.user.onboard, {
      body: formData,
    });
  },

  offboardEmployee(
    empId: string,
    payload: {
      resignation_date?: string;
      exit_type: "VOLUNTARY" | "INVOLUNTARY" | "CONTRACTUAL";
      last_working_day?: string;
      reason?: string | null;
      expected_behavior?: string | null;
      critical_skill?: string | null;
      is_regretted?: boolean;
    }
  ) {
    const body = applyApiDateFields(payload as Record<string, unknown>, [
      "last_working_day",
      "resignation_date",
    ]);
    return apiClient.post<
      ApiEnvelope<{
        emp_id: string;
        status: string;
        employee_name: string;
        exit_type: string;
        reason: string | null;
        critical_skill: string | null;
        is_regretted: boolean;
        resignation_date: string;
        last_working_day: string;
        notice_period_days: number;
        designation: string | null;
        band_name: string | null;
        band_role: string | null;
        project_manager: string | null;
      }>
    >(endpoints.user.offboard(empId), {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  getMyProfile() {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.profile.self);
  },

  getMyLeaveBalances(params?: { year?: number; month?: number }) {
    const query: Record<string, string> = {};
    if (params?.year != null) query.year = String(params.year);
    if (params?.month != null) query.month = String(params.month);
    return apiClient.get<ApiEnvelope<EmployeeLeaveBalancesData>>(endpoints.profile.selfBalances, {
      query,
    });
  },

  updateMyProfile(fd: FormData) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.profile.self, { body: fd });
  },

  getEmployeeProfile(empId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.profile.employeeById(empId));
  },

  updateEmployeeProfile(empId: string, payload: Record<string, unknown>) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.profile.employeeById(empId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getEmployeeLeaveBalances(empId: string) {
    return apiClient.get<ApiEnvelope<EmployeeLeaveBalancesData>>(
      endpoints.profile.employeeBalances(empId)
    );
  },

  /** GET /api/v1/employee-resume — list resumes (account manager). */
  getEmployeeResumes(params: Record<string, string> = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.employeeResume.root, { query: params });
  },

  /** Download resume file for an employee (tries primary then alternate path). */
  async downloadEmployeeResume(empId: string): Promise<Blob> {
    const id = String(empId).trim();
    if (!id) throw new Error("Employee ID is required to download a resume.");
    try {
      return await apiClient.get<Blob>(endpoints.employeeResume.download(id), {
        responseType: "blob",
      });
    } catch {
      return apiClient.get<Blob>(endpoints.employeeResume.downloadAlt(id), {
        responseType: "blob",
      });
    }
  },

  /** GET /api/v1/timelog/get/{empEmail}/{logDate} — logDate is dd/mm/yyyy */
  getTimelogByEmployeeAndDate(empEmail: string, logDate: string) {
    const normalized = toApiDateParam(logDate) ?? logDate.trim();
    return apiClient.get<ApiEnvelope<unknown>>(
      endpoints.timelog.legacyGetByDate(empEmail, normalized),
      { query: { page: "0", size: "200" } }
    );
  },

  getAllocations(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<unknown>>>(endpoints.allocation.root, { query: params });
  },

  /** GET /allocation/employee — allocations for one employee (ROLE_HR | ROLE_ADMIN). */
  getEmployeeAllocations(params: {
    userEmail?: string;
    userId?: number;
    scope?: "current_and_future" | "all";
  }) {
    const query: Record<string, string> = {};
    if (params.userId != null && Number.isFinite(params.userId)) {
      query.userId = String(params.userId);
    } else if (params.userEmail?.trim()) {
      query.userEmail = params.userEmail.trim();
    }
    if (params.scope) query.scope = params.scope;
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.employee, { query });
  },

  /** GET /allocation/{allocationId} — single allocation detail. */
  getAllocationById(allocationId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.byId(allocationId));
  },

  /** GET /allocation/talent-pool — alias of unallocated list (ROLE_HR | ROLE_ADMIN). */
  getTalentPool(params: { page?: number; size?: number; search?: string } = {}) {
    const query: Record<string, string | number> = {
      page: params.page ?? 0,
      size: params.size ?? 50,
    };
    if (params.search?.trim()) query.search = params.search.trim();
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.talentPool, { query });
  },

  /** GET /allocation/talent-pool/unallocated — pagination / search. */
  getTalentPoolUnallocated(params: { page?: number; size?: number; search?: string } = {}) {
    const query: Record<string, string | number> = {
      page: params.page ?? 0,
      size: params.size ?? 50,
    };
    if (params.search?.trim()) query.search = params.search.trim();
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.talentPoolUnallocated, {
      query,
    });
  },

  /** GET /allocation/talent-pool/dashboard — initial load; read data.unallocated.items. */
  getTalentPoolDashboard(
    params: {
      search?: string;
      unallocatedPage?: number;
      unallocatedSize?: number;
    } = {}
  ) {
    const query: Record<string, string | number> = {
      unallocatedPage: params.unallocatedPage ?? 0,
      unallocatedSize: params.unallocatedSize ?? 50,
    };
    if (params.search?.trim()) query.search = params.search.trim();
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.talentPoolDashboard, {
      query,
    });
  },

  /** GET /allocation/deallocated — soft-deleted allocation history (ROLE_HR | ROLE_ADMIN) */
  getDeallocatedAllocations(
    params: {
      page?: string;
      size?: string;
      projectCode?: string;
      userEmail?: string;
      search?: string;
      fromDate?: string;
      toDate?: string;
    } = {}
  ) {
    const query: Record<string, string> = {
      page: params.page ?? "0",
      size: params.size ?? "50",
    };
    if (params.projectCode?.trim()) query.projectCode = params.projectCode.trim();
    if (params.userEmail?.trim()) query.userEmail = params.userEmail.trim();
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.fromDate?.trim()) query.fromDate = params.fromDate.trim();
    if (params.toDate?.trim()) query.toDate = params.toDate.trim();
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.deallocated, { query });
  },

  getActiveNonBenchAllocations(params: { page?: string; size?: string } = {}) {
    const query: Record<string, string> = {};
    if (params.page != null) query.page = String(params.page);
    if (params.size != null) query.size = String(params.size);
    return apiClient.get<ApiEnvelope<ActiveNonBenchAllocationsPage>>(
      endpoints.allocation.activeNonBench,
      { query }
    );
  },

  async fetchAllActiveNonBenchAllocations(pageSize = 200): Promise<Array<Record<string, unknown>>> {
    const all: Array<Record<string, unknown>> = [];
    let page = 0;
    let totalPages = 1;
    while (page < totalPages) {
      const res = await hrmsService.getActiveNonBenchAllocations({
        page: String(page),
        size: String(pageSize),
      });
      const payload = ((res as { data?: unknown }).data ?? res) as Record<string, unknown>;
      const rows = parseAllocationListRows(payload);
      all.push(...rows);
      const tp = Number(payload.total_pages ?? payload.totalPages);
      totalPages = Number.isFinite(tp) && tp > 0 ? tp : page + 1;
      if (!rows.length) break;
      page += 1;
    }
    return all;
  },

  getMyAllocations() {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.allocation.user);
  },

  getAllocationRoles(params: Record<string, string> = {}) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.allocation.roles, { query: params });
  },

  /** GET /allocation/percentages — ROLE_HR | ROLE_ADMIN */
  getAllocationPercentages(params: { designation?: string; role?: string } = {}) {
    const query: Record<string, string> = {};
    const designation = params.designation?.trim() || params.role?.trim();
    if (designation) query.designation = designation;
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.percentages, { query });
  },

  /** GET /allocation/employees — paginated directory for allocate form */
  getAllocationEmployees(params: { page?: string; size?: string; search?: string } = {}) {
    const query: Record<string, string> = {
      page: params.page ?? "0",
      size: params.size ?? "200",
    };
    if (params.search?.trim()) query.search = params.search.trim();
    return apiClient.get<ApiEnvelope<{ items?: unknown[] }>>(endpoints.allocation.employees, {
      query,
    });
  },

  /** GET /allocation/project-employees — projectId or projectCode (required) */
  getAllocationProjectEmployees(
    params: { projectCode?: string; projectId?: string | number; search?: string } = {}
  ) {
    const query: Record<string, string> = {};
    const id =
      params.projectId !== undefined && params.projectId !== null && params.projectId !== ""
        ? String(params.projectId).trim()
        : "";
    const code = params.projectCode?.trim() ?? "";
    if (id) query.projectId = id;
    else if (code) {
      if (/^\d+$/.test(code)) query.projectId = code;
      else query.projectCode = code;
    }
    if (params.search?.trim()) query.search = params.search.trim();
    return apiClient.get<
      ApiEnvelope<{
        items?: unknown[];
        projectId?: number;
        projectCode?: string;
        projectName?: string;
      }>
    >(endpoints.allocation.projectEmployees, { query });
  },

  /** GET /allocation/forecasting — ROLE_HR */
  getAllocationForecasting(
    params: {
      days?: number;
      page?: number;
      size?: number;
      projectCode?: string;
      search?: string;
    } = {}
  ) {
    const query: Record<string, string> = {
      days: Number.isFinite(params.days) ? String(params.days) : "90",
      page: String(params.page ?? 0),
      size: String(params.size ?? 50),
    };
    if (params.projectCode?.trim()) query.projectCode = params.projectCode.trim();
    if (params.search?.trim()) query.search = params.search.trim();
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.forecasting, { query });
  },

  createAllocation(payload: Record<string, unknown>) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.allocation.root, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  updateAllocation(allocationId: string, payload: Record<string, unknown>) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.allocation.byId(allocationId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  /** Soft-deletes allocation; response data is the deallocated row. */
  deleteAllocation(allocationId: string) {
    return apiClient.delete<ApiEnvelope<Record<string, unknown>>>(
      endpoints.allocation.byId(allocationId)
    );
  },

  getProjects(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<unknown>>>(endpoints.project.list, { query: params });
  },

  getAllProjects(params: Record<string, string> = {}) {
    return apiClient.get<ApiEnvelope<PagedData<unknown>>>(endpoints.project.listAll, { query: params });
  },

  getAssignedProjects() {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.project.assignedToUser);
  },

  /** GET /project/types — ROLE_HR | ROLE_ADMIN | ROLE_MANAGER */
  getProjectTypes(params: { activeOnly?: boolean } = {}) {
    const query: Record<string, string> = {};
    if (params.activeOnly !== undefined) {
      query.activeOnly = String(params.activeOnly);
    }
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.project.types, { query });
  },

  /** POST /project — body uses snake_case (project_code, project_name, project_type, …). */
  createProject(payload: Record<string, unknown>) {
    const body = applyApiDateFields(
      {
        project_code: payload.project_code ?? payload.projectCode,
        project_name: payload.project_name ?? payload.projectName,
        project_type: payload.project_type ?? payload.projectType,
        client_name: payload.client_name ?? payload.clientName ?? null,
        account_manager_email: payload.account_manager_email ?? payload.accountManagerEmail,
        start_date: payload.start_date ?? payload.startDate,
        end_date: payload.end_date ?? payload.endDate,
      },
      ["start_date", "end_date"]
    );
    if (!body.start_date) delete body.start_date;
    if (!body.end_date) delete body.end_date;
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.project.createOne, {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  /** GET /project?projectCode= — HR */
  getProjectByCode(projectCode: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.project.getOne, {
      query: { projectCode },
    });
  },

  /** GET /project/manager-emails?projectName= */
  getProjectManagerEmails(projectName: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.project.managerEmailsByProjectName, {
      query: { projectName: projectName.trim() },
    });
  },

  /** POST /projects — body: CreateProjectRequest[] — ROLE_ADMIN per contract */
  createProjectsBulk(payload: Array<Record<string, unknown>>) {
    const body = payload.map((item) => {
      const row = applyApiDateFields(
        {
          project_code: item.project_code ?? item.projectCode,
          project_name: item.project_name ?? item.projectName,
          project_type: item.project_type ?? item.projectType,
          client_name: item.client_name ?? item.clientName ?? null,
          account_manager_email: item.account_manager_email ?? item.accountManagerEmail,
          start_date: item.start_date ?? item.startDate,
          end_date: item.end_date ?? item.endDate,
        },
        ["start_date", "end_date"]
      );
      if (!row.start_date) delete row.start_date;
      if (!row.end_date) delete row.end_date;
      return row;
    });
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.project.createBulk, {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  /** ROLE_MANAGER */
  getManagerProjects() {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.project.managerProjects);
  },

  getManagerProjectsWithRoles() {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.project.managerProjectsWithRoles);
  },

  getTimelogs(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<unknown>>>(endpoints.timelog.root, { query: params });
  },

  getTimelogOptions() {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.timelog.options);
  },

  getTimelogWeek(params: { weekStart: string; employeeEmail?: string }) {
    const query: Record<string, string> = { weekStart: params.weekStart };
    if (params.employeeEmail?.trim()) {
      query.employeeEmail = params.employeeEmail.trim().toLowerCase();
    }
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.timelog.week, { query });
  },

  saveTimelogWeek(payload: Record<string, unknown>) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.timelog.week, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  submitTimelogWeek(payload: { week_start: string; employee_email?: string }) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.timelog.weekSubmit, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  updateTimelogStatus(payload: {
    timelog_id: number;
    status: "APPROVED" | "REJECTED";
    manager_comment?: string | null;
  }) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.timelog.status, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  updateTimelogStatusBatch(payload: {
    employee_email: string;
    project_code: string;
    log_date: string;
    status: "APPROVED" | "REJECTED";
    manager_comment?: string | null;
  }) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.timelog.statusBatch, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getLeaveSummary(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.userRequest.leaveSummary, { query: params });
  },

  /** GET /user/leave-balances — paginated org balances (ROLE_HR | ROLE_ADMIN). */
  getLeaveBalancesList(params: {
    page?: number;
    size?: number;
    search?: string;
    type?: string;
    band?: string;
    year?: number;
    month?: number;
  } = {}) {
    const query: Record<string, string> = {
      page: String(params.page ?? 0),
      size: String(Math.min(params.size ?? 50, 500)),
    };
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.type?.trim()) query.type = params.type.trim();
    if (params.band?.trim()) query.band = params.band.trim();
    if (params.year != null) query.year = String(params.year);
    if (params.month != null) query.month = String(params.month);
    return apiClient.get<ApiEnvelope<LeaveBalancesListData>>(endpoints.userRequest.leaveBalances, {
      query,
    });
  },

  /** GET /manager-team-on-leave-today — ROLE_MANAGER. */
  getManagerTeamOnLeaveToday(params: { asOfDate?: string } = {}) {
    const query: Record<string, string> = {};
    if (params.asOfDate?.trim()) query.asOfDate = params.asOfDate.trim();
    return apiClient.get<ApiEnvelope<ManagerTeamOnLeaveRow[]>>(
      endpoints.userRequest.managerTeamOnLeaveToday,
      { query }
    );
  },

  /** @deprecated Legacy project-scoped picker — use getEmployeeManagers (GET /employees/managers). */
  getLeaveManagerOptions() {
    return apiClient.get<ApiEnvelope<{ items: LeaveManagerOption[] }>>(
      endpoints.userRequest.leaveManagerOptions
    );
  },

  /** GET /employees/managers — ACTIVE employees for primary manager multi-select (leave workflow). */
  getEmployeeManagers(params?: { search?: string }) {
    const query: Record<string, string> = {};
    if (params?.search?.trim()) query.search = params.search.trim();
    return apiClient.get<ApiEnvelope<LeaveManagerOption[]>>(endpoints.employees.managers, {
      query,
    });
  },

  /** @deprecated Additional recipients are server-assigned CC for leave; do not use in employee form. */
  getLeaveRecipientOptions(params?: { search?: string }) {
    const query: Record<string, string> = {};
    if (params?.search?.trim()) query.search = params.search.trim();
    return apiClient.get<ApiEnvelope<{ items: LeaveRecipientOption[] }>>(
      endpoints.userRequest.leaveRecipientOptions,
      { query }
    );
  },

  getNotifications(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<NotificationItem>>>(endpoints.notifications.root, {
      query: params,
    });
  },

  markAllNotificationsRead() {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.notifications.readAll);
  },

  uploadFile(url: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.post<ApiEnvelope<unknown>>(url, { body: fd });
  },

  getBands() {
    return apiClient.get<unknown>(endpoints.masters.bands);
  },

  getDepartments() {
    return apiClient.get<unknown>(endpoints.masters.departments);
  },

  /** GET /masters/onboard-options — `{ message, data: { categories, ... } }`. */
  getOnboardOptions() {
    return apiClient.get<unknown>(endpoints.masters.onboardOptions);
  },

  /** GET /masters/designations — bare array, optional `search`. */
  searchDesignations(params: { band_id: number; department: string; search?: string }) {
    const query: Record<string, string> = {
      band_id: String(params.band_id),
      department: params.department,
    };
    if (params.search?.trim()) query.search = params.search.trim();
    return apiClient.get<unknown>(endpoints.masters.designations, { query });
  },

  /** POST /masters/designations — bare object (HR/Admin). */
  createDesignation(body: { band_id: number; department: string; name: string }) {
    return apiClient.post<unknown>(endpoints.masters.designations, {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  /** @deprecated Use searchDesignations — kept for legacy callers */
  getDesignations(params: { band_id: string; department: string }) {
    return this.searchDesignations({
      band_id: Number(params.band_id),
      department: params.department,
    });
  },

  getKpis(params: Record<string, string>) {
    return apiClient.get<unknown>(endpoints.masters.kpiDefinitions, { query: params });
  },

  assignRole(payload: {
    target_email?: string;
    role?: string;
    userEmail?: string;
    roleName?: string;
  }) {
    const body = {
      userEmail: payload.userEmail ?? payload.target_email,
      roleName: payload.roleName ?? payload.role,
      target_email: payload.target_email ?? payload.userEmail,
      role: payload.role ?? payload.roleName,
    };
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.roleAdmin.assignRole, {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  /** POST /roles/assign-project-manager — ROLE_HR | ROLE_ADMIN */
  assignProjectManager(payload: { userEmail: string; projectCode: string }) {
    return apiClient.post<unknown>(endpoints.roleAdmin.assignProjectManager, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  triggerScheduler() {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.roleAdmin.schedulerRunAll);
  },

  createAllocationExtensionRequest(payload: {
    userEmail: string;
    projectCode: string;
    requestedEndDate: string;
    reason?: string;
  }) {
    return apiClient.post<ApiEnvelope<number>>(endpoints.allocation.extensionRequest, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  /** Active allocation context for extension request form (manager). */
  getAllocationExtensionContext(params: {
    userEmail: string;
    projectCode?: string;
    projectId?: number;
  }) {
    const query: Record<string, string | number> = {
      userEmail: params.userEmail.trim(),
    };
    if (params.projectId != null && Number.isFinite(params.projectId)) {
      query.projectId = params.projectId;
    } else if (params.projectCode?.trim()) {
      query.projectCode = params.projectCode.trim();
    }
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.extensionContext, {
      query,
    });
  },

  /** ROLE_HR / ROLE_ADMIN */
  async listAllocationExtensionRequests(params: {
    page?: number;
    size?: number;
    search?: string;
    status?: AllocationExtensionRequestStatus;
  }) {
    const query: Record<string, string | number> = {};
    if (params.page != null) query.page = params.page;
    if (params.size != null) query.size = params.size;
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.status) query.status = params.status;

    const res = await apiClient.get<ApiEnvelope<unknown>>(endpoints.allocation.extensionRequest, {
      query,
    });
    const page = parseAllocationExtensionListResponse(res);
    return { ...res, data: page } as ApiEnvelope<ApiPage<AllocationExtensionRequestRow>>;
  },

  /** ROLE_HR / ROLE_ADMIN */
  async updateAllocationExtensionRequestStatus(payload: {
    requestId: number;
    status: Exclude<AllocationExtensionRequestStatus, "PENDING">;
  }) {
    const res = await apiClient.put<ApiEnvelope<unknown>>(endpoints.allocation.extensionStatus, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
    return res;
  },

  /** ROLE_MANAGER (also allowed for HR/Admin per backend contract) */
  async listManagerAllocationExtensionStatus(params: {
    page?: number;
    size?: number;
    search?: string;
    projectCode?: string;
  }) {
    const res = await apiClient.get<ApiEnvelope<unknown>>(
      endpoints.allocation.managerExtensionStatus,
      { query: params }
    );
    const page = parseAllocationExtensionListResponse(res);
    return { ...res, data: page } as ApiEnvelope<ApiPage<AllocationExtensionRequestRow>>;
  },

  getWorkforceHeadcountDistribution(params: {
    page?: number;
    size?: number;
    search?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.headcountDistribution, {
      query: params,
    });
  },

  getWorkforceRoleBilling(params: {
    page?: number;
    size?: number;
    search?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.roleBilling, {
      query: params,
    });
  },

  getWorkforceExperienceBands(params: {
    page?: number;
    size?: number;
    search?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.experienceBands, {
      query: params,
    });
  },

  getUtilizationByDepartment(params: {
    page?: number;
    size?: number;
    search?: string;
    as_of?: string;
  } = {}) {
    const query = applyApiDateQuery(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
      ) as Record<string, string>,
      ["as_of"]
    );
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.utilizationByDepartment, {
      query,
    });
  },

  getBenchAging(params: {
    page?: number;
    size?: number;
    search?: string;
    as_of?: string;
  } = {}) {
    const query = applyApiDateQuery(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
      ) as Record<string, string>,
      ["as_of"]
    );
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.benchAging, {
      query,
    });
  },

  getAttritionOverallPercent(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionOverallPercent, {
      query: params,
    });
  },

  getAttritionVoluntaryInvoluntary(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionVoluntaryInvoluntary, {
      query: params,
    });
  },

  getAttritionRoleWise(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionRoleWise, {
      query: params,
    });
  },

  getAttritionManagerWise(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionManagerWise, {
      query: params,
    });
  },

  getAttritionCriticalSkill(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionCriticalSkill, {
      query: params,
    });
  },

  getAttritionRegretted(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionRegretted, {
      query: params,
    });
  },

  getAttritionAverageTenure(params: { fy_start_year: number }) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.attritionAverageTenure, {
      query: params,
    });
  },

  upsertAttritionRecord(
    empId: string,
    payload: {
      separation_type: "VOLUNTARY" | "INVOLUNTARY";
      reason?: string;
      critical_skill?: string;
      is_regretted?: boolean;
      last_working_day: string;
    }
  ) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.hrReports.attritionUpsert(empId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getSkillInventory(params: {
    page?: number;
    size?: number;
    search?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.skillInventory, {
      query: params,
    });
  },

  getContractDistribution(params: {
    page?: number;
    size?: number;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.contractDistribution, {
      query: params,
    });
  },

  getBgvDashboard(params: {
    page?: number;
    size?: number;
    search?: string;
    overall_status?: string;
    employment_status?: string;
    reference_status?: string;
  } = {}) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.bgvDashboard, {
      query: params,
    });
  },

  upsertBgvRecord(
    empId: string,
    payload: {
      consent_form_signed: boolean;
      identity: string;
      employment_status: string;
      reference_status: string;
      mail_id_verified: string;
      onboarding_form_status: string;
      overall_status: string;
      remarks?: string;
    }
  ) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.hrReports.bgvByEmployee(empId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getBgvRecord(empId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.hrReports.bgvByEmployee(empId));
  },

  uploadAnnualCalendar(payload: {
    year: number;
    title?: string | null;
    document_link: string;
  }) {
    return apiClient.post<ApiEnvelope<AnnualCalendarItem>>(endpoints.annualCalendar.root, {
      contentType: "application/json",
      body: JSON.stringify({
        year: payload.year,
        title: payload.title ?? null,
        document_link: payload.document_link,
      }),
    });
  },

  getAnnualCalendars() {
    return apiClient.get<ApiEnvelope<{ items: AnnualCalendarItem[] }>>(endpoints.annualCalendar.root);
  },

  getAnnualCalendarByYear(year: number | string) {
    return apiClient.get<ApiEnvelope<AnnualCalendarItem>>(endpoints.annualCalendar.byYear(year));
  },

  getHolidayCalendars() {
    return apiClient.get<ApiEnvelope<{ items: HolidayCalendarItem[] }>>(endpoints.holidayCalendar.root);
  },

  getCompanyHolidayCalendar() {
    return apiClient.get<ApiEnvelope<HolidayCalendarDetail>>(endpoints.holidayCalendar.company);
  },

  getHolidayCalendar(id: number | string) {
    return apiClient.get<ApiEnvelope<HolidayCalendarDetail>>(endpoints.holidayCalendar.byId(id));
  },

  createHolidayCalendar(payload: { code: string; name: string; description?: string | null }) {
    return apiClient.post<ApiEnvelope<HolidayCalendarItem>>(endpoints.holidayCalendar.root, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  updateHolidayCalendar(
    id: number | string,
    payload: { name?: string; description?: string | null; is_active?: boolean }
  ) {
    return apiClient.put<ApiEnvelope<HolidayCalendarItem>>(endpoints.holidayCalendar.byId(id), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  importHolidayCalendarsCsv(file: File) {
    return this.uploadFile(endpoints.holidayCalendar.importCsv, file);
  },

  importEmployeeHolidayAssignmentsCsv(file: File) {
    return this.uploadFile(endpoints.holidayCalendar.importAssignmentsCsv, file);
  },

  async downloadHolidayCalendarsCsv(): Promise<Blob> {
    return apiClient.get<Blob>(endpoints.holidayCalendar.exportCsv, { responseType: "blob" });
  },

  async downloadEmployeeHolidayAssignmentsCsv(): Promise<Blob> {
    return apiClient.get<Blob>(endpoints.holidayCalendar.exportAssignmentsCsv, { responseType: "blob" });
  },

  // Learning & Development
  createTraining(payload: Record<string, unknown>) {
    const body = applyApiDateFields(payload, ["start_date", "end_date"]);
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.trainings, {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  updateTraining(trainingId: string, payload: Record<string, unknown>) {
    const body = applyApiDateFields(payload, ["start_date", "end_date"]);
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.learning.trainingById(trainingId), {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  getTrainings() {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.trainings);
  },

  getTrainingById(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.learning.trainingById(trainingId));
  },

  assignTrainers(trainingId: string, trainerUserIds: number[]) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.trainers(trainingId), {
      contentType: "application/json",
      body: JSON.stringify({ trainer_user_ids: trainerUserIds }),
    });
  },

  /** GET /api/v1/trainings/{training_id}/trainers — list trainers for a training. */
  getTrainingTrainers(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.trainers(trainingId));
  },

  removeTrainer(trainingId: string, trainerUserId: string) {
    return apiClient.delete<ApiEnvelope<unknown>>(endpoints.learning.trainerById(trainingId, trainerUserId));
  },

  createTrainingSession(trainingId: string, payload: Record<string, unknown>) {
    const body = applyApiDateFields(payload, ["session_date"]);
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.sessions(trainingId), {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  getTrainingSessions(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.sessions(trainingId));
  },

  addTrainingParticipants(trainingId: string, payload: Record<string, unknown>) {
    return apiClient.post<ApiEnvelope<unknown[]>>(endpoints.learning.participants(trainingId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getTrainingParticipants(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.participants(trainingId));
  },

  removeTrainingParticipant(trainingId: string, userId: string) {
    return apiClient.delete<ApiEnvelope<unknown>>(endpoints.learning.participantByUserId(trainingId, userId));
  },

  updateTrainingParticipantStatus(trainingId: string, userId: string, enrollmentStatus: "WITHDRAWN" | "COMPLETED") {
    return apiClient.patch<ApiEnvelope<unknown>>(endpoints.learning.participantByUserId(trainingId, userId), {
      contentType: "application/json",
      body: JSON.stringify({ enrollment_status: enrollmentStatus }),
    });
  },

  selfEnrollTraining(trainingId: string) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.enroll(trainingId));
  },

  getOpenTrainings() {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.open);
  },

  uploadTrainingMaterial(trainingId: string, payload: {
    title: string;
    visibility?: "HR_ONLY" | "EMPLOYEE";
    materialFile: File;
  }) {
    const fd = new FormData();
    fd.append("title", payload.title);
    fd.append("visibility", payload.visibility ?? "EMPLOYEE");
    fd.append("material_file", payload.materialFile);
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.materials(trainingId), { body: fd });
  },

  getTrainingMaterials(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.materials(trainingId));
  },

  markAttendance(trainingId: string, sessionId: string, payload: {
    user_id: number;
    attendance_status: "PRESENT" | "ABSENT";
  }) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.attendance(trainingId, sessionId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  getAttendance(trainingId: string, sessionId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.attendance(trainingId, sessionId));
  },

  uploadAssessment(trainingId: string, payload: {
    name: string;
    description?: string;
    weight_percent: number;
    assessmentFile: File;
  }) {
    const fd = new FormData();
    fd.append("name", payload.name);
    fd.append("description", payload.description ?? "");
    fd.append("weight_percent", String(payload.weight_percent));
    fd.append("assessment_file", payload.assessmentFile);
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.assessments(trainingId), { body: fd });
  },

  getAssessments(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.learning.assessments(trainingId));
  },

  /** HR / Admin — all participants (draft or published). */
  getTrainingScores(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.learning.scores(trainingId));
  },

  /** Enrolled employee — published marks only (403 until published). */
  getMyTrainingMarks(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.learning.myMarks(trainingId));
  },

  submitTrainingScores(trainingId: string, payload: {
    user_id: number;
    scores_json: Record<string, number>;
    mark_completed?: boolean;
  }) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.learning.scores(trainingId), {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  /** POST …/trainings/:id/assessments/:assessmentId/marks/publish — emails scores to trainees (HR/Admin). */
  publishTrainingMarks(trainingId: string, assessmentId: string) {
    return apiClient.post<ApiEnvelope<unknown>>(
      endpoints.learning.marksPublish(trainingId, assessmentId)
    );
  },

  getTrainingAnalytics(trainingId: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.learning.analytics(trainingId));
  },
};
