"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hrmsService } from "@/services/hrms.service";
import { compOffService } from "@/services/compOff.service";
import { InputField, SelectField, DatePickerField } from "@/components/dashboard/ui/forms";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { ProjectSelectField } from "@/components/comp-off/ProjectSelectField";
import { useAccountManagerEmails } from "@/hooks/useAccountManagerEmails";
import { useManagerPortfolioEmails } from "@/hooks/comp-off/useManagerPortfolioEmails";
import { requestRowEmail } from "@/utils/learning/onboardOptions";
import { isAccountManagerEmployeeUser } from "@/utils/roles";
import type { CompOffProjectOption } from "@/utils/compOffProjects";
import {
  loadCompOffProjectCatalog,
  resolveCompOffManagerEmail,
  type CompOffProjectCatalog,
} from "@/services/compOffProjectCatalog.service";
import type { CompOffGrant } from "@/types/compOff";
import {
  COMP_OFF_EARN_LIST_TYPE,
  COMP_OFF_USAGE_LIST_TYPE,
  addDaysIso,
  availableUnitsFromGrants,
  calendarDaysInclusive,
  isCompOffRequestType,
  patchRequestRowStatus,
  applyTeamRequestDecisions,
  effectiveRequestRowStatus,
  inferStatusFromAlreadyActedError,
  isAlreadyActedOnRequestError,
  isWeekendYmd,
  normalizeCompOffRequestType,
  normalizeRequestStatus,
  pickRowField,
  isPendingRequestStatus,
  requestRowId,
  requestRowStatus,
  sortGrantsFifo,
} from "@/utils/compOff";
import {
  compOffEarnActionLabel,
  compOffRejectMessage,
  compOffTeamReviewActionLabel,
  compOffUsageActionLabel,
} from "@/utils/compOffActionToast";
import {
  compOffEmployeeDisplayName,
  resolveEmployeeNamesByEmail,
} from "@/utils/compOff/resolveEmployeeDisplayNames";

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultRequestRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function requestTypeLabel(type: unknown): string {
  const n = normalizeCompOffRequestType(type);
  if (n === "COMP_OFF_EARN") return "Earn";
  if (n === "COMP_OFF") return "Usage";
  return String(type ?? "—");
}

function isPendingStage(value: unknown): boolean {
  const s = normalizeRequestStatus(value);
  return s === "PENDING";
}

export function CompOffPageClient() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { toast, actionLoading, runAction } = useDashboardAction();
  const {
    hasHrAccess,
    hasManagerAccess,
    requiresSelfOnboarding,
  } = useDashboardAccess();

  const userEmail = String(user?.email ?? "").trim().toLowerCase();
  const submitsToHrForReview = isAccountManagerEmployeeUser(user?.roles ?? []);
  const { data: accountManagerEmails = new Set<string>() } = useAccountManagerEmails();
  const managerOnlyReview = hasManagerAccess && !hasHrAccess;
  const canApplyCompOff = !hasHrAccess && !hasManagerAccess;
  const {
    teamEmails: managerTeamEmails,
    loading: managerPortfolioLoading,
  } = useManagerPortfolioEmails(managerOnlyReview);

  const [mainTab, setMainTab] = useState<"my" | "team">(
    pathname.includes("/dashboard/comp-off/team") ? "team" : "my"
  );
  useEffect(() => {
    if (!canApplyCompOff && (hasHrAccess || hasManagerAccess)) {
      setMainTab("team");
      return;
    }
    if (pathname.includes("/dashboard/comp-off/team")) setMainTab("team");
    else if (pathname.includes("/dashboard/comp-off")) setMainTab("my");
  }, [pathname, canApplyCompOff, hasHrAccess, hasManagerAccess]);

  const [balanceUnits, setBalanceUnits] = useState<number | null>(null);
  const [balanceAsOf, setBalanceAsOf] = useState(todayYmd());
  const [grants, setGrants] = useState<CompOffGrant[]>([]);
  const [grantsLoading, setGrantsLoading] = useState(false);

  const [projectOptions, setProjectOptions] = useState<CompOffProjectOption[]>([]);
  const [projectCatalog, setProjectCatalog] = useState<CompOffProjectCatalog | null>(null);
  const [managerEmailResolving, setManagerEmailResolving] = useState(false);

  const [earnForm, setEarnForm] = useState({
    worked_date: "",
    project_code: "",
    manager_comp_off_email: "",
    comments: "",
  });
  const [usageForm, setUsageForm] = useState({
    request_from_date: "",
    request_to_date: "",
    comments: "",
  });
  const [editingRequestId, setEditingRequestId] = useState("");

  const [myRequests, setMyRequests] = useState<Array<Record<string, unknown>>>([]);
  const [myRequestsFlowFilter, setMyRequestsFlowFilter] = useState<"ALL" | "EARN" | "USAGE">("ALL");
  const [teamRequests, setTeamRequests] = useState<Array<Record<string, unknown>>>([]);
  const [teamEmployeeNames, setTeamEmployeeNames] = useState<Record<string, string>>({});
  const [teamRequestUpdatingId, setTeamRequestUpdatingId] = useState<string | null>(null);
  const [teamDecisions, setTeamDecisions] = useState<Record<string, "APPROVED" | "REJECTED">>({});
  const teamDecisionsRef = useRef<Map<string, "APPROVED" | "REJECTED">>(new Map());
  const [teamFilters, setTeamFilters] = useState(() => ({
    ...defaultRequestRange(),
    flow: "ALL" as "ALL" | "EARN" | "USAGE",
    accountManagersOnly: false,
  }));

  const usageDays = useMemo(() => {
    const from = usageForm.request_from_date.trim();
    const to = usageForm.request_to_date.trim();
    if (!from || !to) return 0;
    return calendarDaysInclusive(from, to);
  }, [usageForm.request_from_date, usageForm.request_to_date]);

  const computedBalance = useMemo(
    () => availableUnitsFromGrants(grants, balanceAsOf),
    [grants, balanceAsOf]
  );

  const derivedBalanceFromRequests = useMemo(() => {
    let approvedEarnUnits = 0;
    let approvedUsageUnits = 0;
    for (const row of myRequests) {
      if (normalizeRequestStatus(requestRowStatus(row)) !== "APPROVED") continue;
      const flow = normalizeCompOffRequestType(row.request_type ?? row.requestType);
      const hasHalfDay = Boolean(
        pickRowField(row, "is_half_day", "isHalfDay", "half_day", "halfDay") === true
      );
      const explicitUnits = Number(
        pickRowField(row, "comp_off_units", "compOffUnits", "units", "day_count", "dayCount") ?? NaN
      );
      const from = String(pickRowField(row, "request_from_date", "requestFromDate") ?? "").trim();
      const to = String(pickRowField(row, "request_to_date", "requestToDate") ?? "").trim();
      if (flow === "COMP_OFF_EARN") {
        if (Number.isFinite(explicitUnits) && explicitUnits > 0) approvedEarnUnits += explicitUnits;
        else approvedEarnUnits += hasHalfDay ? 0.5 : 1;
      } else if (flow === "COMP_OFF") {
        if (Number.isFinite(explicitUnits) && explicitUnits > 0) approvedUsageUnits += explicitUnits;
        else approvedUsageUnits += (hasHalfDay ? 0.5 : 1) * Math.max(1, calendarDaysInclusive(from, to));
      }
    }
    return Math.max(0, approvedEarnUnits - approvedUsageUnits);
  }, [myRequests]);

  const displayBalance = useMemo(() => {
    if (balanceUnits !== null && balanceUnits > 0) return balanceUnits;
    const apiComputed = computedBalance;
    if (apiComputed > 0) return apiComputed;
    return derivedBalanceFromRequests;
  }, [balanceUnits, computedBalance, derivedBalanceFromRequests]);
  const usingDerivedBalance = displayBalance === derivedBalanceFromRequests && displayBalance > 0;
  const canUseCompOff = displayBalance > 0;
  const filteredMyRequests = useMemo(() => {
    if (myRequestsFlowFilter === "ALL") return myRequests;
    return myRequests.filter((row) => {
      const t = normalizeCompOffRequestType(row.request_type ?? row.requestType);
      if (myRequestsFlowFilter === "EARN") return t === "COMP_OFF_EARN";
      return t === "COMP_OFF";
    });
  }, [myRequests, myRequestsFlowFilter]);

  const selectedProject = useMemo(
    () => projectOptions.find((p) => p.code === earnForm.project_code.trim()),
    [projectOptions, earnForm.project_code]
  );

  const loadBalanceAndGrants = useCallback(async () => {
    const asOf = todayYmd();
    setBalanceAsOf(asOf);
    setGrantsLoading(true);
    try {
      const [balanceRes, grantsRes] = await Promise.allSettled([
        compOffService.getBalance(asOf),
        compOffService.getGrants(),
      ]);
      if (balanceRes.status === "fulfilled") {
        const b = compOffService.parseBalanceResponse(balanceRes.value);
        const units = Number(b?.available_units ?? b?.availableUnits);
        setBalanceUnits(Number.isFinite(units) ? units : null);
        const asOfDate = String(b?.as_of_date ?? b?.asOfDate ?? asOf).trim();
        if (asOfDate) setBalanceAsOf(asOfDate);
      } else {
        setBalanceUnits(null);
      }
      if (grantsRes.status === "fulfilled") {
        setGrants(sortGrantsFifo(compOffService.parseGrantsResponse(grantsRes.value)));
      } else {
        setGrants([]);
      }
    } finally {
      setGrantsLoading(false);
    }
  }, []);

  const loadProfileBalanceFallback = useCallback(async () => {
    try {
      const profileRes = await hrmsService.getMyProfile();
      const profile = (profileRes.data ?? null) as Record<string, unknown> | null;
      const empId = String(profile?.emp_id ?? profile?.empId ?? "").trim();
      if (!empId) return;
      const balRes = await hrmsService.getEmployeeLeaveBalances(empId);
      const units = Number(balRes.data?.comp_off_balance);
      if (Number.isFinite(units) && balanceUnits === null) {
        setBalanceUnits(units);
      }
    } catch {
      /* optional fallback */
    }
  }, [balanceUnits]);

  const loadAssignedProjects = useCallback(async () => {
    try {
      const catalog = await loadCompOffProjectCatalog();
      setProjectCatalog(catalog);
      setProjectOptions(catalog.options);
    } catch {
      setProjectCatalog(null);
      setProjectOptions([]);
    }
  }, []);

  const onEarnProjectChange = useCallback(
    (projectCode: string) => {
      const option = projectOptions.find((p) => p.code === projectCode);
      setEarnForm((prev) => ({
        ...prev,
        project_code: projectCode,
        manager_comp_off_email: option?.managerEmail ?? "",
      }));
      if (!projectCode) return;
      if (option?.managerEmail) return;
      setManagerEmailResolving(true);
      const catalog = projectCatalog;
      void (async () => {
        let email = option?.managerEmail ?? "";
        if (!email && catalog) {
          email = await resolveCompOffManagerEmail(projectCode, catalog);
        }
        if (email) {
          setEarnForm((prev) =>
            prev.project_code === projectCode ? { ...prev, manager_comp_off_email: email } : prev
          );
          setProjectOptions((prev) =>
            prev.map((p) =>
              p.code === projectCode ? { ...p, managerEmail: email } : p
            )
          );
        }
        setManagerEmailResolving(false);
      })();
    },
    [projectOptions, projectCatalog]
  );

  const loadMyRequests = useCallback(async () => {
    if (!userEmail) {
      setMyRequests([]);
      return;
    }
    const future = new Date();
    future.setFullYear(future.getFullYear() + 2);
    const from = "2000-01-01";
    const to = future.toISOString().slice(0, 10);
    const [earnRes, usageRes] = await Promise.all([
      compOffService.listEarnRequests({ fromDate: from, toDate: to }),
      compOffService.listRequests({
        fromDate: from,
        toDate: to,
        requestType: COMP_OFF_USAGE_LIST_TYPE,
        empEmails: userEmail,
      }),
    ]);
    const earnRows: Array<Record<string, unknown>> = compOffService.parseRequestRows(earnRes).map((row) => ({
      ...row,
      request_type: COMP_OFF_EARN_LIST_TYPE,
      request_from_date: pickRowField(row, "request_from_date", "requestFromDate", "worked_date", "workedDate"),
      request_to_date: pickRowField(row, "request_to_date", "requestToDate", "worked_date", "workedDate"),
      comments: pickRowField(row, "comments", "comment", "work_description", "workDescription"),
      user_request_status: pickRowField(row, "user_request_status", "userRequestStatus", "status") ?? "PENDING",
    }));
    const usageRows = compOffService.parseRequestRows(usageRes).filter((row) => {
      const t = normalizeCompOffRequestType(row.request_type ?? row.requestType);
      return t === "COMP_OFF";
    });
    const merged = [...earnRows, ...usageRows].filter((row) =>
      isCompOffRequestType(row.request_type ?? row.requestType)
    );

    const seen = new Set<string>();
    const deduped = merged.filter((row) => {
      const id = requestRowId(row);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    deduped.sort((a, b) => {
      const da = String(pickRowField(a, "request_from_date", "requestFromDate") ?? "");
      const db = String(pickRowField(b, "request_from_date", "requestFromDate") ?? "");
      return db.localeCompare(da);
    });
    setMyRequests(deduped);
    const hasApprovedEarn = deduped.some((row) => {
      const t = normalizeCompOffRequestType(row.request_type ?? row.requestType);
      return t === "COMP_OFF_EARN" && requestRowStatus(row) === "APPROVED";
    });
    const shouldRefreshBalance = deduped.some((row) => {
      const status = requestRowStatus(row);
      if (status !== "APPROVED") return false;
      return isCompOffRequestType(row.request_type ?? row.requestType);
    });
    if (shouldRefreshBalance) {
      void loadBalanceAndGrants();
    }
  }, [userEmail, loadBalanceAndGrants]);

  const applyTeamRequests = useCallback(async (merged: Array<Record<string, unknown>>) => {
    setTeamDecisions((prev) => {
      const next: Record<string, "APPROVED" | "REJECTED"> = { ...prev };
      for (const row of merged) {
        const id = requestRowId(row);
        const serverStatus = requestRowStatus(row);
        if (id && (serverStatus === "APPROVED" || serverStatus === "REJECTED")) {
          next[id] = serverStatus;
        }
      }
      teamDecisionsRef.current = new Map(Object.entries(next));
      return next;
    });
    const emails = merged.map((row) => requestRowEmail(row)).filter(Boolean);
    const names = await resolveEmployeeNamesByEmail(emails);
    setTeamEmployeeNames(names);
    setTeamRequests(applyTeamRequestDecisions(merged, teamDecisionsRef.current));
  }, []);

  const patchTeamRequestStatus = useCallback((requestId: string, next: "APPROVED" | "REJECTED") => {
    teamDecisionsRef.current.set(requestId, next);
    setTeamDecisions((prev) => ({ ...prev, [requestId]: next }));
    setTeamRequests((prev) =>
      prev.map((row) => (requestRowId(row) === requestId ? patchRequestRowStatus(row, next) : row))
    );
  }, []);

  const decideTeamRequest = useCallback(
    async (
      requestId: string,
      flow: "COMP_OFF_EARN" | "COMP_OFF" | null,
      status: "APPROVED" | "REJECTED",
      message?: string | null
    ) => {
      if (!requestId) throw new Error("Invalid request id.");
      setTeamRequestUpdatingId(requestId);
      try {
        try {
          if (managerOnlyReview && flow === "COMP_OFF_EARN") {
            await compOffService.updateEarnRequestStatus(Number(requestId), status, message);
          } else {
            await compOffService.updateRequestStatus(Number(requestId), status, message);
          }
        } catch (error) {
          if (isAlreadyActedOnRequestError(error)) {
            patchTeamRequestStatus(requestId, status);
            return;
          }
          const inferred = inferStatusFromAlreadyActedError(error);
          if (inferred === "APPROVED" || inferred === "REJECTED") {
            patchTeamRequestStatus(requestId, inferred);
            return;
          }
          throw error;
        }
        patchTeamRequestStatus(requestId, status);
      } finally {
        setTeamRequestUpdatingId(null);
      }
    },
    [managerOnlyReview, patchTeamRequestStatus]
  );

  const loadTeamRequests = useCallback(async () => {
    const from = teamFilters.from.trim() || defaultRequestRange().from;
    const to = teamFilters.to.trim() || defaultRequestRange().to;

    if (managerOnlyReview) {
      const team = managerTeamEmails;
      const emailCsv = Array.from(team).filter(Boolean).join(",");
      const earnRes = await compOffService.listEarnRequests({
        fromDate: from,
        toDate: to,
      });
      const earnRows: Array<Record<string, unknown>> = compOffService.parseRequestRows(earnRes).map((row) => ({
        ...row,
        request_type: COMP_OFF_EARN_LIST_TYPE,
        request_from_date: pickRowField(row, "request_from_date", "requestFromDate", "worked_date", "workedDate"),
        request_to_date: pickRowField(row, "request_to_date", "requestToDate", "worked_date", "workedDate"),
        comments: pickRowField(row, "comments", "comment", "work_description", "workDescription"),
        user_request_status: pickRowField(row, "user_request_status", "userRequestStatus", "status") ?? "PENDING",
      }));
      const usageRows = emailCsv
        ? compOffService.parseRequestRows(
            await compOffService.listRequests({
              fromDate: from,
              toDate: to,
              requestType: COMP_OFF_USAGE_LIST_TYPE,
              empEmails: emailCsv,
            })
          )
        : [];
      let merged: Array<Record<string, unknown>> = [...earnRows, ...usageRows];
      merged = merged.filter((row) => {
        const t = normalizeCompOffRequestType(row.request_type ?? row.requestType);
        if (teamFilters.flow === "EARN") return t === "COMP_OFF_EARN";
        if (teamFilters.flow === "USAGE") return t === "COMP_OFF";
        return true;
      });
      merged = merged.filter((row) => {
        const t = normalizeCompOffRequestType(row.request_type ?? row.requestType);
        if (t !== "COMP_OFF_EARN" && t !== "COMP_OFF") return false;
        const routedManager = String(
          pickRowField(row, "manager_comp_off_email", "managerCompOffEmail") ?? ""
        )
          .trim()
          .toLowerCase();
        const emp = requestRowEmail(row);
        if (routedManager && userEmail && routedManager === userEmail) return true;
        return emp ? team.has(emp) : false;
      });
      const seenMgr = new Set<string>();
      merged = merged.filter((row) => {
        const id = requestRowId(row);
        if (!id || seenMgr.has(id)) return false;
        seenMgr.add(id);
        return true;
      });
      await applyTeamRequests(merged);
      return;
    }

    const earnTypes = teamFilters.flow === "USAGE" ? [] : [COMP_OFF_EARN_LIST_TYPE];
    const usageTypes = teamFilters.flow === "EARN" ? [] : [COMP_OFF_USAGE_LIST_TYPE];
    const types = [...earnTypes, ...usageTypes];
    if (!types.length && !hasHrAccess) {
      setTeamEmployeeNames({});
      setTeamRequests([]);
      return;
    }
    let merged: Array<Record<string, unknown>> = [];
    if (hasHrAccess) {
      if (teamFilters.flow !== "USAGE") {
        const earnRes = await compOffService.listEarnRequests({ fromDate: from, toDate: to });
        merged.push(
          ...compOffService.parseRequestRows(earnRes).map((row) => ({
            ...row,
            request_type: COMP_OFF_EARN_LIST_TYPE,
            request_from_date: pickRowField(
              row,
              "request_from_date",
              "requestFromDate",
              "worked_date",
              "workedDate"
            ),
            request_to_date: pickRowField(
              row,
              "request_to_date",
              "requestToDate",
              "worked_date",
              "workedDate"
            ),
            comments: pickRowField(row, "comments", "comment", "work_description", "workDescription"),
            user_request_status: pickRowField(
              row,
              "user_request_status",
              "userRequestStatus",
              "status"
            ) ?? "PENDING",
          }))
        );
      }
      if (teamFilters.flow !== "EARN") {
        const usageRows = await compOffService.fetchHrTeamRequests({
          fromDate: from,
          toDate: to,
          requestTypes: [COMP_OFF_USAGE_LIST_TYPE],
        });
        merged.push(...usageRows);
      }
    } else {
      merged = await compOffService.fetchHrTeamRequests({
        fromDate: from,
        toDate: to,
        requestTypes: types,
      });
    }
    merged = merged.filter((row) => isCompOffRequestType(row.request_type ?? row.requestType));

    merged = merged.filter((row) => {
      const t = normalizeCompOffRequestType(row.request_type ?? row.requestType);
      if (teamFilters.flow === "EARN") return t === "COMP_OFF_EARN";
      if (teamFilters.flow === "USAGE") return t === "COMP_OFF";
      return true;
    });
    if (hasHrAccess) {
      merged = merged.filter((row) => {
        const t = normalizeCompOffRequestType(row.request_type ?? row.requestType);
        return t === "COMP_OFF";
      });
    }
    if (teamFilters.accountManagersOnly) {
      merged = merged.filter((row) => {
        const email = requestRowEmail(row);
        return email ? accountManagerEmails.has(email) : false;
      });
    }

    const seen = new Set<string>();
    merged = merged.filter((row) => {
      const id = requestRowId(row);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    await applyTeamRequests(merged);
  }, [
    teamFilters,
    hasHrAccess,
    managerOnlyReview,
    managerTeamEmails,
    userEmail,
    accountManagerEmails,
    applyTeamRequests,
  ]);

  useEffect(() => {
    void loadBalanceAndGrants();
    void loadAssignedProjects();
    void loadMyRequests();
  }, [loadBalanceAndGrants, loadAssignedProjects, loadMyRequests]);

  useEffect(() => {
    if (balanceUnits === null && grants.length === 0 && !grantsLoading) {
      void loadProfileBalanceFallback();
    }
  }, [balanceUnits, grants.length, grantsLoading, loadProfileBalanceFallback]);

  useEffect(() => {
    if (mainTab !== "team" || (!hasManagerAccess && !hasHrAccess)) return;
    if (managerOnlyReview && managerPortfolioLoading) return;
    void loadTeamRequests();
  }, [
    mainTab,
    hasManagerAccess,
    hasHrAccess,
    managerOnlyReview,
    managerPortfolioLoading,
    loadTeamRequests,
  ]);

  useEffect(() => {
    if (mainTab !== "my" || !canApplyCompOff) return;
    void loadMyRequests();
    void loadBalanceAndGrants();
  }, [mainTab, canApplyCompOff, loadMyRequests, loadBalanceAndGrants]);

  useEffect(() => {
    if (mainTab !== "my" || !canApplyCompOff) return;
    const refreshEmployeeView = () => {
      void loadMyRequests();
      void loadBalanceAndGrants();
    };
    window.addEventListener("focus", refreshEmployeeView);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshEmployeeView();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refreshEmployeeView);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mainTab, canApplyCompOff, loadMyRequests, loadBalanceAndGrants]);

  async function submitEarn() {
    const workedDate = earnForm.worked_date.trim();
    const projectCode = earnForm.project_code.trim();
    let managerEmail = earnForm.manager_comp_off_email.trim().toLowerCase();
    if (!managerEmail && selectedProject?.managerEmail) {
      managerEmail = selectedProject.managerEmail;
    }
    if (!managerEmail && projectCatalog) {
      managerEmail = await resolveCompOffManagerEmail(projectCode, projectCatalog);
    }
    const comments = earnForm.comments.trim();
    if (!workedDate) throw new Error("Worked date is required.");
    if (!isWeekendYmd(workedDate)) {
      throw new Error("Worked date must be a weekend (Saturday or Sunday).");
    }
    if (!projectCode) throw new Error("Project is required.");
    if (comments.length > 200) throw new Error("Comments must be 200 characters or less.");
    if (editingRequestId) {
      throw new Error("Editing earn requests is not supported. Revoke and submit a new earn request.");
    } else {
      await compOffService.createEarnRequest({
        worked_date: workedDate,
        workedDate,
        project_code: projectCode,
        projectCode,
        work_description: comments,
        workDescription: comments,
      });
    }
    setEarnForm({ worked_date: "", project_code: "", manager_comp_off_email: "", comments: "" });
    setEditingRequestId("");
    await Promise.all([loadMyRequests(), loadBalanceAndGrants()]);
  }

  async function submitUsage() {
    if (!canUseCompOff) {
      throw new Error(
        "You have no comp-off balance. Submit an earn request and get manager approval first."
      );
    }
    const fromDate = usageForm.request_from_date.trim();
    const toDate = usageForm.request_to_date.trim();
    const comments = usageForm.comments.trim();
    if (!fromDate || !toDate) throw new Error("From date and to date are required.");
    if (Date.parse(toDate) < Date.parse(fromDate)) {
      throw new Error("To date cannot be earlier than from date.");
    }
    const days = calendarDaysInclusive(fromDate, toDate);
    if (days < 1) throw new Error("Select at least one calendar day.");
    if (displayBalance < days) {
      throw new Error(
        `Insufficient comp-off balance. Available: ${displayBalance}, requested: ${days} day(s).`
      );
    }
    if (comments.length > 200) throw new Error("Comments must be 200 characters or less.");
    const payload = {
      request_type: "COMP_OFF",
      request_from_date: fromDate,
      request_to_date: toDate,
      comments,
      comment: comments,
      description: comments,
      remarks: comments,
      is_half_day: false,
    };
    if (editingRequestId) {
      await compOffService.updateRequest({
        ...payload,
        user_request_id: Number(editingRequestId),
      });
    } else {
      await compOffService.createRequest(payload);
    }
    setUsageForm({ request_from_date: "", request_to_date: "", comments: "" });
    setEditingRequestId("");
    await loadMyRequests();
  }

  const canReviewTeam = managerOnlyReview || hasHrAccess;
  const showMyCompOff = canApplyCompOff && mainTab !== "team";
  const showTeamReview = canReviewTeam && !canApplyCompOff ? true : mainTab === "team";

  return (
    <>
      <DashboardPageShell>
        <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-wt-text">Comp-off</h2>
              <p className="text-sm text-wt-text-muted mt-1">
                Earn credits for weekend project work and use them for time off.
              </p>
            </div>

            {canApplyCompOff && canReviewTeam ? (
              <div className="flex flex-wrap gap-2 border-b border-wt-border pb-3">
                <button
                  type="button"
                  onClick={() => setMainTab("my")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    mainTab === "my"
                      ? "bg-wt-surface-3 text-wt-text"
                      : "text-wt-text-muted hover:bg-wt-surface-2"
                  }`}
                >
                  My comp-off
                </button>
                <button
                  type="button"
                  onClick={() => setMainTab("team")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    mainTab === "team"
                      ? "bg-wt-surface-3 text-wt-text"
                      : "text-wt-text-muted hover:bg-wt-surface-2"
                  }`}
                >
                  Team review
                </button>
              </div>
            ) : null}

            {showMyCompOff ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Comp-off balance</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-semibold text-wt-text">{displayBalance}</p>
                      <p className="text-xs text-wt-text-muted">unit{displayBalance === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
                    <div>
                      <h3 className="font-semibold">Earn credit</h3>
                    </div>
                    <DatePickerField
                      label="Worked date"
                      value={earnForm.worked_date}
                      onChange={(v) => setEarnForm((p) => ({ ...p, worked_date: v }))}
                    />
                    <ProjectSelectField
                      label="Project"
                      value={earnForm.project_code}
                      options={projectOptions}
                      onChange={onEarnProjectChange}
                    />
                    <InputField
                      label="Comments"
                      value={earnForm.comments}
                      onChange={(v) => setEarnForm((p) => ({ ...p, comments: v }))}
                    />
                    {earnForm.worked_date.trim() ? (
                      <p className="text-xs text-wt-text-muted">
                        Expires on {addDaysIso(earnForm.worked_date.trim(), 60)} (60 days after
                        worked date).
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      disabled={
                        actionLoading ||
                        !earnForm.project_code.trim() ||
                        managerEmailResolving
                      }
                      onClick={() =>
                        runAction(compOffEarnActionLabel(editingRequestId ? "update" : "submit"), submitEarn)
                      }
                    >
                      {editingRequestId ? "Save earn request" : "Submit earn request"}
                    </button>
                  </div>

                  <div
                    className={`rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3 ${
                      !canUseCompOff ? "opacity-75" : ""
                    }`}
                  >
                    <div>
                      <h3 className="font-semibold">Use comp-off</h3>
                    </div>
                    {!canUseCompOff ? (
                      <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        You have no comp-off balance yet. Submit an earn request and get your
                        project manager&apos;s approval before using comp-off.
                      </p>
                    ) : null}
                    <fieldset
                      disabled={!canUseCompOff}
                      className="space-y-3 border-0 p-0 m-0 min-w-0"
                    >
                      <DatePickerField
                        label="From date"
                        value={usageForm.request_from_date}
                        onChange={(v) =>
                          setUsageForm((p) => ({ ...p, request_from_date: v }))
                        }
                        disabled={!canUseCompOff}
                      />
                      <DatePickerField
                        label="To date"
                        value={usageForm.request_to_date}
                        onChange={(v) =>
                          setUsageForm((p) => ({ ...p, request_to_date: v }))
                        }
                        disabled={!canUseCompOff}
                      />
                      <InputField
                        label="Comments"
                        value={usageForm.comments}
                        onChange={(v) => setUsageForm((p) => ({ ...p, comments: v }))}
                      />
                      {usageDays > 0 && canUseCompOff ? (
                        <p className="text-sm text-wt-text-muted">
                          This range uses <strong>{usageDays}</strong> unit
                          {usageDays === 1 ? "" : "s"} (calendar days). Available:{" "}
                          <strong>{displayBalance}</strong>.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className="btn-primary px-3 py-2"
                        disabled={actionLoading || !canUseCompOff}
                        onClick={() =>
                          runAction(
                            compOffUsageActionLabel(editingRequestId ? "update" : "submit"),
                            submitUsage
                          )
                        }
                      >
                        {editingRequestId ? "Save usage request" : "Submit usage request"}
                      </button>
                    </fieldset>
                  </div>
                </div>

                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">My requests</h3>
                    <div className="flex items-end gap-2">
                      <SelectField
                        label="Flow"
                        value={myRequestsFlowFilter}
                        options={["ALL", "EARN", "USAGE"]}
                        onChange={(v) =>
                          setMyRequestsFlowFilter(v as "ALL" | "EARN" | "USAGE")
                        }
                      />
                      <button
                        type="button"
                        className="btn-primary px-3 py-2 text-sm"
                        disabled={actionLoading}
                        onClick={() => runAction("Refresh my comp-off requests", loadMyRequests)}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                  {filteredMyRequests.length ? (
                    <div className="wt-scroll-both max-h-[min(50vh,400px)] rounded-xl border border-wt-border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-wt-surface-2 text-wt-text-muted">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Flow</th>
                            <th className="text-left px-3 py-2 font-medium">From</th>
                            <th className="text-left px-3 py-2 font-medium">To</th>
                            <th className="text-left px-3 py-2 font-medium">Status</th>
                            <th className="text-left px-3 py-2 font-medium">Comments</th>
                            <th className="text-right px-3 py-2 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMyRequests.map((row, idx) => {
                            const id = requestRowId(row);
                            const status = requestRowStatus(row);
                            const isPending = isPendingRequestStatus(status);
                            const flow = normalizeCompOffRequestType(
                              row.request_type ?? row.requestType
                            );
                            const canEdit = isPending && Boolean(id) && flow === "COMP_OFF";
                            return (
                              <tr key={`${id || idx}`} className="border-t border-wt-border">
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {requestTypeLabel(row.request_type ?? row.requestType)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {String(
                                    pickRowField(row, "request_from_date", "requestFromDate") ?? "—"
                                  )}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {String(
                                    pickRowField(row, "request_to_date", "requestToDate") ?? "—"
                                  )}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">{status}</td>
                                <td className="px-3 py-2 max-w-[200px] truncate">
                                  {String(
                                    pickRowField(row, "comments", "comment", "description", "remarks") ??
                                      "—"
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {isPending && id ? (
                                    <div className="inline-flex gap-1">
                                      {canEdit ? (
                                        <button
                                          type="button"
                                          className="rounded-lg px-2 py-1 text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                          disabled={actionLoading}
                                          onClick={() => {
                                            setUsageForm({
                                              request_from_date: String(
                                                pickRowField(row, "request_from_date", "requestFromDate") ?? ""
                                              ),
                                              request_to_date: String(
                                                pickRowField(row, "request_to_date", "requestToDate") ?? ""
                                              ),
                                              comments: String(
                                                pickRowField(
                                                  row,
                                                  "comments",
                                                  "comment",
                                                  "description",
                                                  "remarks"
                                                ) ?? ""
                                              ),
                                            });
                                            setEditingRequestId(id);
                                          }}
                                        >
                                          Edit
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        className="rounded-lg px-2 py-1 text-xs border border-rose-600/30 text-rose-700 hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={actionLoading}
                                        onClick={() =>
                                          runAction(
                                            flow === "COMP_OFF_EARN"
                                              ? compOffEarnActionLabel("revoke")
                                              : compOffUsageActionLabel("revoke"),
                                            async () => {
                                              await compOffService.deleteRequest(Number(id));
                                              if (editingRequestId === id) setEditingRequestId("");
                                              await loadMyRequests();
                                            }
                                          )
                                        }
                                      >
                                        Revoke
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-wt-text-muted">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-wt-text-muted">No comp-off requests yet.</p>
                  )}
                </div>
              </div>
            ) : showTeamReview ? (
              <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
                {hasHrAccess ? (
                  <p className="text-sm text-wt-text-muted">
                    Review manager-approved comp-off usage claims. HR approves or rejects requests
                    from this queue.
                  </p>
                ) : (
                  <p className="text-sm text-wt-text-muted">
                    Manager can approve/reject employee earn and usage requests from team review.
                  </p>
                )}
                <div className="flex flex-wrap items-end gap-3">
                  <InputField
                    label="From"
                    type="date"
                    value={teamFilters.from}
                    onChange={(v) => setTeamFilters((p) => ({ ...p, from: v }))}
                  />
                  <InputField
                    label="To"
                    type="date"
                    value={teamFilters.to}
                    onChange={(v) => setTeamFilters((p) => ({ ...p, to: v }))}
                  />
                  <SelectField
                    label="Flow"
                    value={teamFilters.flow}
                    options={["ALL", "EARN", "USAGE"]}
                    onChange={(v) =>
                      setTeamFilters((p) => ({
                        ...p,
                        flow: v as "ALL" | "EARN" | "USAGE",
                      }))
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-wt-text-muted pb-2">
                    <input
                      type="checkbox"
                      checked={teamFilters.accountManagersOnly}
                      onChange={(e) =>
                        setTeamFilters((p) => ({
                          ...p,
                          accountManagersOnly: e.target.checked,
                        }))
                      }
                      className="rounded border-wt-border"
                    />
                    Account managers only
                  </label>
                  <button
                    type="button"
                    className="btn-primary px-3 py-2 h-10"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction(compOffTeamReviewActionLabel("COMP_OFF", "fetch"), loadTeamRequests)
                    }
                  >
                    Fetch requests
                  </button>
                </div>

                {teamRequests.length ? (
                  <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-wt-surface-2 text-wt-text-muted">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Employee</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Email</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Flow</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">From</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">To</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Description</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                            {hasHrAccess ? "HR Status" : "Status"}
                          </th>
                          <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamRequests.map((row, idx) => {
                          const id = requestRowId(row);
                          const status = effectiveRequestRowStatus(row, teamDecisions);
                          const rowEmail = requestRowEmail(row);
                          const isAm = rowEmail ? accountManagerEmails.has(rowEmail) : false;
                          const flow = normalizeCompOffRequestType(
                            row.request_type ?? row.requestType
                          );
                          const routedManager = String(
                            pickRowField(row, "manager_comp_off_email", "managerCompOffEmail") ??
                              ""
                          )
                            .trim()
                            .toLowerCase();
                          const empEmail = requestRowEmail(row);
                          const isPending = isPendingRequestStatus(status);
                          const managerCanAct =
                            managerOnlyReview &&
                            ((userEmail && routedManager === userEmail) ||
                              (empEmail && managerTeamEmails.has(empEmail)));
                          const isRowUpdating = teamRequestUpdatingId === id;
                          const hrStatus = normalizeRequestStatus(
                            pickRowField(row, "hr_status", "hrStatus") ?? status
                          );
                          const hrCanAct =
                            hasHrAccess &&
                            flow === "COMP_OFF" &&
                            isPendingStage(hrStatus);
                          const canReview =
                            !isRowUpdating &&
                            (hasHrAccess
                              ? hrCanAct
                              : (flow === "COMP_OFF_EARN" || flow === "COMP_OFF") &&
                                isPending &&
                                managerCanAct);
                          const statusTone =
                            (hasHrAccess ? hrStatus : status) === "APPROVED"
                              ? "text-emerald-700"
                              : (hasHrAccess ? hrStatus : status) === "REJECTED"
                                ? "text-rose-700"
                                : "text-wt-text";
                          return (
                            <tr key={`${id || idx}`} className="border-t border-wt-border">
                              <td className="px-3 py-2 whitespace-nowrap">
                                {compOffEmployeeDisplayName(row, teamEmployeeNames)}
                                {isAm ? (
                                  <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                                    AM
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">{empEmail || "—"}</td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {requestTypeLabel(row.request_type ?? row.requestType)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {String(
                                  pickRowField(row, "request_from_date", "requestFromDate") ?? "—"
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {String(
                                  pickRowField(row, "request_to_date", "requestToDate") ?? "—"
                                )}
                              </td>
                              <td className="px-3 py-2 max-w-[220px] truncate">
                                {String(
                                  pickRowField(row, "comments", "comment", "description", "remarks") ?? "—"
                                )}
                              </td>
                              <td className={`px-3 py-2 whitespace-nowrap font-medium ${statusTone}`}>
                                {String(hasHrAccess ? hrStatus : status)}
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                {canReview ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      className="rounded-lg px-2.5 py-1.5 text-xs border border-emerald-600/25 text-emerald-800 bg-emerald-50/40 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                      disabled={!id || isRowUpdating}
                                      onClick={() =>
                                        runAction(
                                          compOffTeamReviewActionLabel(
                                            flow ?? "COMP_OFF",
                                            "approve"
                                          ),
                                          () => decideTeamRequest(id, flow, "APPROVED")
                                        )
                                      }
                                    >
                                      {isRowUpdating ? "…" : "Approve"}
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-lg px-2.5 py-1.5 text-xs border border-rose-600/25 text-rose-800 bg-rose-50/40 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                      disabled={!id || isRowUpdating}
                                      onClick={() =>
                                        runAction(
                                          compOffTeamReviewActionLabel(
                                            flow ?? "COMP_OFF",
                                            "reject"
                                          ),
                                          () =>
                                            decideTeamRequest(
                                              id,
                                              flow,
                                              "REJECTED",
                                              compOffRejectMessage({ hasHrAccess, managerOnlyReview })
                                            )
                                        )
                                      }
                                    >
                                      {isRowUpdating ? "…" : "Reject"}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-wt-text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-wt-text-muted">
                    No requests loaded. Click <strong>Fetch requests</strong>.
                  </p>
                )}
              </div>
            ) : null}
          </section>
        </OnboardingGate>
      </DashboardPageShell>
      <DashboardToast toast={toast} />
    </>
  );
}
