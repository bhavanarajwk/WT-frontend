import { endpoints } from "@/src/api/endpoints";
import { apiClient, type ApiEnvelope } from "@/src/api/httpClient";

export interface PagedData<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface OnboardItem {
  emp_id: string | null;
  email: string;
  name: string;
  status: string;
  user_type: string;
  department?: string | null;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const hrmsService = {
  getOnboardList(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<OnboardItem>>>(endpoints.user.onboard, {
      query: params,
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
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.user.onboard, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  completeMyOnboarding(formData: FormData) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.user.onboard, {
      body: formData,
    });
  },

  getMyProfile() {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.profile.self);
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

  getAllocations(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<PagedData<unknown>>>(endpoints.allocation.root, { query: params });
  },

  getMyAllocations() {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.allocation.user);
  },

  getAllocationRoles(params: Record<string, string> = {}) {
    return apiClient.get<ApiEnvelope<unknown[]>>(endpoints.allocation.roles, { query: params });
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

  deleteAllocation(allocationId: string) {
    return apiClient.delete<ApiEnvelope<unknown>>(endpoints.allocation.byId(allocationId));
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

  createProject(payload: Record<string, unknown>) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.project.createOne, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  /** GET /project?projectCode= — HR */
  getProjectByCode(projectCode: string) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.project.getOne, {
      query: { projectCode },
    });
  },

  /** POST /projects — body: CreateProjectRequest[] — ROLE_ADMIN per contract */
  createProjectsBulk(payload: Array<Record<string, unknown>>) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.project.createBulk, {
      contentType: "application/json",
      body: JSON.stringify(payload),
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

  getLeaveSummary(params: Record<string, string>) {
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.userRequest.leaveSummary, { query: params });
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

  getDesignations(params: { band_id: string; department: string }) {
    return apiClient.get<unknown>(endpoints.masters.designations, {
      query: params,
    });
  },

  getKpis(params: Record<string, string>) {
    return apiClient.get<unknown>(endpoints.masters.kpiDefinitions, { query: params });
  },

  triggerScheduler() {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.roleAdmin.schedulerRunAll);
  },
};
