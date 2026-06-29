const api = "/api/v1";

export const endpoints = {
  health: "/health",

  auth: {
    googleSignIn: `${api}/google-signin`,
    googleCallback: `${api}/auth/google/callback`,
    refresh: `${api}/auth/refresh`,
    activity: `${api}/auth/activity`,
    logout: `${api}/auth/logout`,
    oauthBypass: (email: string) => `${api}/oauth/bypass/${encodeURIComponent(email)}`,
  },

  user: {
    onboard: `${api}/user/onboard`,
    resendOnboardInvite: `${api}/user/onboard/resend-invite`,
    invited: `${api}/user/invited`,
    offboardList: `${api}/user/offboard`,
    offboard: (empId: string) => `${api}/user/offboard/${encodeURIComponent(empId)}`,
    lookup: `${api}/user`,
    batch: `${api}/user/batch`,
  },

  profile: {
    self: `${api}/profile`,
    selfBalances: `${api}/profile/balances`,
    employeeById: (empId: string) => `${api}/employee-profile/${encodeURIComponent(empId)}`,
    employeeBalances: (empId: string) =>
      `${api}/employee-profile/${encodeURIComponent(empId)}/balances`,
  },

  employeeResume: {
    root: `${api}/employee-resume`,
    download: (empId: string) =>
      `${api}/employee-resume/download/${encodeURIComponent(empId)}`,
    downloadAlt: (empId: string) =>
      `${api}/employee-resume/${encodeURIComponent(empId)}/download`,
  },

  upload: {
    leave: `${api}/upload`,
    allocation: `${api}/upload-allocation`,
    userData: `${api}/upload/user-data`,
    allocationBatch: `${api}/allocation/batch`,
  },

  allocation: {
    root: `${api}/allocation`,
    deallocated: `${api}/allocation/deallocated`,
    activeNonBench: `${api}/allocation/active-non-bench`,
    byId: (allocationId: string) => `${api}/allocation/${encodeURIComponent(allocationId)}`,
    employee: `${api}/allocation/employee`,
    updateLegacy: `${api}/allocation/update`,
    roles: `${api}/allocation/roles`,
    percentages: `${api}/allocation/percentages`,
    employees: `${api}/allocation/employees`,
    projectEmployees: `${api}/allocation/project-employees`,
    user: `${api}/allocation/user`,
    forecasting: `${api}/allocation/forecasting`,
    talentPool: `${api}/allocation/talent-pool`,
    talentPoolUnallocated: `${api}/allocation/talent-pool/unallocated`,
    talentPoolDashboard: `${api}/allocation/talent-pool/dashboard`,
    benchUsers: `${api}/allocation/bench-users`,
    extensionRequest: `${api}/allocation-extension-request`,
    extensionContext: `${api}/allocation-extension-request/context`,
    extensionStatus: `${api}/allocation-extension-request/status`,
    managerExtensionStatus: `${api}/manager/allocation-extension-status`,
  },

  project: {
    createOne: `${api}/project`,
    types: `${api}/project/types`,
    createBulk: `${api}/projects`,
    list: `${api}/projects`,
    listAll: `${api}/projects/all`,
    getOne: `${api}/project`,
    managerEmailsByProjectName: `${api}/project/manager-emails`,
    managerProjects: `${api}/manager-projects`,
    managerProjectsWithRoles: `${api}/manager-projects-with-roles`,
    assignedToUser: `${api}/project-assigned-to-user`,
  },

  timelog: {
    root: `${api}/timelog`,
    options: `${api}/timelog/options`,
    week: `${api}/timelog/week`,
    weekSubmit: `${api}/timelog/week/submit`,
    byId: (timelogId: string) => `${api}/timelog/${encodeURIComponent(timelogId)}`,
    legacyGetByDate: (empEmail: string, logDate: string) =>
      `${api}/timelog/get/${encodeURIComponent(empEmail)}/${encodeURIComponent(logDate)}`,
    legacyEntry: `${api}/timelog/entry`,
    status: `${api}/timelog/status`,
    statusBatch: `${api}/timelog/status/batch`,
    export: `${api}/export/timelogs`,
  },

  userRequest: {
    root: `${api}/userRequest`,
    getRange: (fromDate: string, toDate: string, requestType: string) =>
      `${api}/userRequest/get/${encodeURIComponent(fromDate)}/${encodeURIComponent(toDate)}/${encodeURIComponent(requestType)}`,
    getByEmployees: (empEmails: string, fromDate: string, toDate: string, requestType: string) =>
      `${api}/userRequest/get/${encodeURIComponent(empEmails)}/${encodeURIComponent(fromDate)}/${encodeURIComponent(toDate)}/${encodeURIComponent(requestType)}`,
    status: `${api}/userRequest/status`,
    leaveManagerOptions: `${api}/leave-request/manager-options`, // @deprecated — use employees.managers
    leaveRecipientOptions: `${api}/leave-request/recipient-options`, // @deprecated — CC is server-assigned
    leaveSummary: `${api}/leave-summary`,
    leaveBalances: `${api}/user/leave-balances`,
    managerTeamOnLeaveToday: `${api}/manager-team-on-leave-today`,
  },

  compOff: {
    earn: `${api}/comp-off/earn`,
    earnStatus: `${api}/comp-off/earn/status`,
    /** @deprecated Backend uses expiry for balance; kept for reference only. */
    balance: `${api}/comp-off/expiry`,
    expiry: `${api}/comp-off/expiry`,
    grants: `${api}/comp-off/grants`,
    grantsForEmployee: (empId: string) =>
      `${api}/comp-off/grants/${encodeURIComponent(empId)}`,
  },

  employees: {
    managers: `${api}/employees/managers`,
  },

  learning: {
    trainings: `${api}/trainings`,
    trainingById: (trainingId: string | number) => `${api}/trainings/${encodeURIComponent(String(trainingId))}`,
    trainers: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/trainers`,
    trainerById: (trainingId: string | number, trainerUserId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/trainers/${encodeURIComponent(String(trainerUserId))}`,
    sessions: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/sessions`,
    participants: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/participants`,
    participantByUserId: (trainingId: string | number, userId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/participants/${encodeURIComponent(String(userId))}`,
    enroll: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/enroll`,
    open: `${api}/trainings/open`,
    materials: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/materials`,
    attendance: (trainingId: string | number, sessionId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/sessions/${encodeURIComponent(String(sessionId))}/attendance`,
    assessments: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/assessments`,
    scores: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/scores`,
    myMarks: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/my-marks`,
    marksPublish: (trainingId: string | number, assessmentId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/assessments/${encodeURIComponent(String(assessmentId))}/marks/publish`,
    analytics: (trainingId: string | number) =>
      `${api}/trainings/${encodeURIComponent(String(trainingId))}/analytics`,
  },

  notifications: {
    root: `${api}/notifications`,
    readById: (notificationId: string) =>
      `${api}/notifications/${encodeURIComponent(notificationId)}/read`,
    readAll: `${api}/notifications/read-all`,
    announcement: `${api}/notifications/announcement`,
    deleteRead: `${api}/notifications/delete`,
    subscribe: `${api}/notifications/subscribe`,
  },

  masters: {
    bands: `${api}/masters/bands`,
    departments: `${api}/masters/departments`,
    onboardOptions: `${api}/masters/onboard-options`,
    designations: `${api}/masters/designations`,
    kpiDefinitions: `${api}/masters/kpi-definitions`,
    kpiDefinitionById: (kpiId: string) =>
      `${api}/masters/kpi-definitions/${encodeURIComponent(kpiId)}`,
    webknotValues: `${api}/masters/webknot-values`,
    webknotValueById: (rowId: string) =>
      `${api}/masters/webknot-values/${encodeURIComponent(rowId)}`,
    submissionCycles: `${api}/masters/submission-cycles`,
    submissionCycleByKey: `${api}/masters/submission-cycles/by-key`,
    submissionCycleById: (cycleId: string) =>
      `${api}/masters/submission-cycles/${encodeURIComponent(cycleId)}`,
  },

  roleAdmin: {
    assignRole: `${api}/roles/assign`,
    assignRoleLegacy: `${api}/assign-role`,
    assignProjectManager: `${api}/roles/assign-project-manager`,
    schedulerRunAll: `${api}/scheduler/run-all`,
  },

  annualCalendar: {
    root: `${api}/annual-calendar`,
    byYear: (year: string | number) =>
      `${api}/annual-calendar/${encodeURIComponent(String(year))}`,
  },

  holidayCalendar: {
    root: `${api}/holiday-calendars`,
    company: `${api}/holiday-calendars/company`,
    byId: (id: string | number) =>
      `${api}/holiday-calendars/${encodeURIComponent(String(id))}`,
    importCsv: `${api}/holiday-calendars/import-csv`,
    exportCsv: `${api}/holiday-calendars/export-csv`,
    importAssignmentsCsv: `${api}/holiday-calendars/employee-assignments/import-csv`,
    exportAssignmentsCsv: `${api}/holiday-calendars/employee-assignments/export-csv`,
  },

  exitInterview: {
    formDefinition: `${api}/exit-interview/form-definition`,
    submit: `${api}/exit-interview`,
    submissions: `${api}/exit-interview/submissions`,
    submissionByLookupId: (lookupId: string) =>
      `${api}/exit-interview/submissions/${encodeURIComponent(lookupId)}`,
    minutesOfMeetingByLookupId: (lookupId: string) =>
      `${api}/exit-interview/submissions/${encodeURIComponent(lookupId)}/minutes-of-meeting`,
    resendBulk: `${api}/exit-interview/resend`,
    resend: (empId: string) =>
      `${api}/exit-interview/resend/${encodeURIComponent(empId)}`,
  },

  hrReports: {
    headcountDistribution: `${api}/reports/workforce/headcount-distribution`,
    roleBilling: `${api}/reports/workforce/role-wise-billed`,
    experienceBands: `${api}/reports/workforce/experience`,
    utilizationByDepartment: `${api}/reports/utilization/utilization-by-department`,
    benchAging: `${api}/reports/utilization/bench-aging`,
    attritionOverallPercent: `${api}/reports/attrition/overall-percent`,
    attritionVoluntaryInvoluntary: `${api}/reports/attrition/voluntary-involuntary`,
    attritionRoleWise: `${api}/reports/attrition/role-wise`,
    attritionManagerWise: `${api}/reports/attrition/manager-wise`,
    attritionCriticalSkill: `${api}/reports/attrition/critical-skill`,
    attritionRegretted: `${api}/reports/attrition/regretted`,
    attritionAverageTenure: `${api}/reports/attrition/average-tenure`,
    attritionUpsert: (empId: string) => `${api}/reports/attrition/${encodeURIComponent(empId)}`,
    skillInventory: `${api}/reports/skill-capacity/skill-inventory`,
    contractDistribution: `${api}/reports/compliance/contract-distribution`,
    bgvDashboard: `${api}/reports/bgv`,
    bgvByEmployee: (empId: string) => `${api}/reports/bgv/${encodeURIComponent(empId)}`,
  },
} as const;

export type EndpointRegistry = typeof endpoints;
