"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hrmsService } from "@/services/hrms.service";
import { compOffService } from "@/services/compOff.service";
import { InputField, SelectField, TextAreaField } from "@/components/dashboard/ui/forms";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { ProjectSelectField } from "@/components/comp-off/ProjectSelectField";
import { WeekendMultiDateField } from "@/components/comp-off/WeekendMultiDateField";
import { useAccountManagerEmails } from "@/hooks/useAccountManagerEmails";
import { useManagerPortfolioEmails } from "@/hooks/comp-off/useManagerPortfolioEmails";
import { requestRowEmail } from "@/utils/learning/onboardOptions";
import { isAccountManagerEmployeeUser } from "@/utils/roles";
import { fetchSelfProfile } from "@/utils/selfProfile";
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
  availableUnitsFromGrants,
  calendarDaysInclusive,
  grantExpiryDate,
  grantRemainingUnits,
  grantStatus,
  isCompOffRequestType,
  mapEarnListRow,
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
  requestEarnManagerStatus,
  requestRowId,
  requestRowStatus,
  sortGrantsFifo,
} from "@/utils/compOff";
import {
  formatStageRejectionReason,
  requestFinalStatus,
  canHrActOnCompOff,
  requestHrStatus,
  requestManagerStatus,
} from "@/utils/userRequest";
import { compareApiDates, formatApiDateDisplay, normalizeToApiDate } from "@/utils/apiDate";
import { UserRequestRejectDialog } from "@/components/dashboard/leave/UserRequestRejectDialog";
import {
  compOffEarnActionLabel,
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

export type CompOffPageClientProps = {
  /** Render inside Leave requests (no extra page shell). */
  embedded?: boolean;
  /** Earn-only (Comp off tab) vs full page with usage (standalone). */
  flowScope?: "earn" | "both";
  forcedTab?: "my" | "team";
  /** Sync team date filters from Leave → Team requests bar. */
  teamFromDate?: string;
  teamToDate?: string;
  /** Increment from parent Fetch to reload team list. */
  teamReloadKey?: number;
};

export function CompOffPageClient({
  embedded = false,
  flowScope = "both",
  forcedTab,
  teamFromDate,
  teamToDate,
  teamReloadKey,
}: CompOffPageClientProps = {}) {
  const earnOnly = flowScope === "earn";
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
  const isHrOnly = hasHrAccess && !hasManagerAccess;
  const canApplyCompOff = !hasHrAccess && !hasManagerAccess;
  const {
    teamEmails: managerTeamEmails,
    loading: managerPortfolioLoading,
  } = useManagerPortfolioEmails(hasManagerAccess);

  const [mainTab, setMainTab] = useState<"my" | "team">(
    forcedTab ?? (pathname.includes("/dashboard/comp-off/team") ? "team" : "my")
  );
  useEffect(() => {
    if (forcedTab) {
      setMainTab(forcedTab);
      return;
    }
    if (!canApplyCompOff && (hasHrAccess || hasManagerAccess)) {
      setMainTab("team");
      return;
    }
    if (pathname.includes("/dashboard/comp-off/team")) setMainTab("team");
    else if (pathname.includes("/dashboard/comp-off")) setMainTab("my");
  }, [forcedTab, pathname, canApplyCompOff, hasHrAccess, hasManagerAccess]);

  const [balanceUnits, setBalanceUnits] = useState<number | null>(null);
  const [balanceAsOf, setBalanceAsOf] = useState(todayYmd());
  const [grants, setGrants] = useState<CompOffGrant[]>([]);
  const [grantsLoading, setGrantsLoading] = useState(false);

  const [projectOptions, setProjectOptions] = useState<CompOffProjectOption[]>([]);
  const [projectCatalog, setProjectCatalog] = useState<CompOffProjectCatalog | null>(null);
  const [managerEmailResolving, setManagerEmailResolving] = useState(false);

  const [earnForm, setEarnForm] = useState({
    worked_dates: [] as string[],
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
  const [pendingReject, setPendingReject] = useState<{
    requestId: string;
    flow: "COMP_OFF_EARN" | "COMP_OFF";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [teamFilters, setTeamFilters] = useState(() => ({
    ...defaultRequestRange(),
    flow: "ALL" as "ALL" | "EARN" | "USAGE",
  }));

  const useParentTeamDates = embedded && forcedTab === "team";

  useEffect(() => {
    if (!useParentTeamDates) return;
    setTeamFilters((prev) => ({
      ...prev,
      ...(teamFromDate?.trim() ? { from: teamFromDate.trim() } : {}),
      ...(teamToDate?.trim() ? { to: teamToDate.trim() } : {}),
    }));
  }, [useParentTeamDates, teamFromDate, teamToDate]);

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
  const nearestExpiryDate = useMemo(() => {
    const asOf = normalizeToApiDate(balanceAsOf) || balanceAsOf;
    const active = grants.filter((grant) => {
      if (grantStatus(grant) !== "ACTIVE") return false;
      if (grantRemainingUnits(grant) <= 0) return false;
      const expiry = normalizeToApiDate(grantExpiryDate(grant));
      if (!expiry) return true;
      return compareApiDates(expiry, asOf) >= 0;
    });
    const nearest = sortGrantsFifo(active)[0];
    if (!nearest) return "";
    return normalizeToApiDate(grantExpiryDate(nearest)) || grantExpiryDate(nearest);
  }, [grants, balanceAsOf]);
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

  const earnProjectLabel = useCallback(
    (row: Record<string, unknown>) => {
      const code = String(pickRowField(row, "project_code", "projectCode") ?? "").trim();
      if (!code) return "—";
      const option = projectOptions.find((p) => p.code === code);
      return option?.label ?? code;
    },
    [projectOptions]
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
      let units: number | null = null;
      if (balanceRes.status === "fulfilled") {
        const b = compOffService.parseBalanceResponse(balanceRes.value);
        const parsed = Number(b?.available_units ?? b?.availableUnits);
        units = Number.isFinite(parsed) ? parsed : null;
        const asOfDate = String(b?.as_of_date ?? b?.asOfDate ?? asOf).trim();
        if (asOfDate) setBalanceAsOf(asOfDate);
      }
      let grantList: CompOffGrant[] = [];
      if (grantsRes.status === "fulfilled") {
        grantList = sortGrantsFifo(compOffService.parseGrantsResponse(grantsRes.value));
        setGrants(grantList);
      } else {
        setGrants([]);
      }
      if (units === null && grantList.length) {
        units = availableUnitsFromGrants(grantList, asOf);
      }
      setBalanceUnits(units);
    } finally {
      setGrantsLoading(false);
    }
  }, []);

  const loadProfileBalanceFallback = useCallback(async () => {
    try {
      const profile = await fetchSelfProfile(user?.roles ?? []);
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
  }, [balanceUnits, user?.roles]);

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
    const earnRows = await compOffService.listEarnRequestRows({ fromDate: from, toDate: to });
    let usageRows: Array<Record<string, unknown>> = [];
    if (!earnOnly) {
      try {
        const usageRes = await compOffService.listRequests({
          fromDate: from,
          toDate: to,
          requestType: COMP_OFF_USAGE_LIST_TYPE,
          empEmails: userEmail,
        });
        usageRows = compOffService.parseRequestRows(usageRes).filter((row) => {
          const t = normalizeCompOffRequestType(row.request_type ?? row.requestType);
          return t === "COMP_OFF";
        });
      } catch {
        usageRows = [];
      }
    }
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
      const da = normalizeToApiDate(
        String(
          pickRowField(a, "worked_date", "workedDate", "request_from_date", "requestFromDate") ?? ""
        )
      );
      const db = normalizeToApiDate(
        String(
          pickRowField(b, "worked_date", "workedDate", "request_from_date", "requestFromDate") ?? ""
        )
      );
      return compareApiDates(db, da);
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
  }, [userEmail, loadBalanceAndGrants, earnOnly]);

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
      reason?: string | null
    ) => {
      if (!requestId) throw new Error("Invalid request id.");
      if (flow === "COMP_OFF_EARN" && isHrOnly) {
        throw new Error("HR can view earn requests but cannot approve or reject them.");
      }
      if (flow === "COMP_OFF_EARN" && !hasManagerAccess) {
        throw new Error("Only the project manager can approve or reject earn requests.");
      }
      setTeamRequestUpdatingId(requestId);
      try {
        try {
          if (flow === "COMP_OFF_EARN") {
            await compOffService.updateEarnRequestStatus(Number(requestId), status, reason);
          } else {
            await compOffService.updateRequestStatus(Number(requestId), status, {
              reason,
              requireReasonOnReject: status === "REJECTED" && !isHrOnly,
            });
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
    [hasManagerAccess, isHrOnly, patchTeamRequestStatus]
  );

  const loadTeamRequests = useCallback(async (opts?: { raiseOnError?: boolean }) => {
    const from = teamFilters.from.trim() || defaultRequestRange().from;
    const to = teamFilters.to.trim() || defaultRequestRange().to;

    try {
    const teamFlow = earnOnly ? "EARN" : teamFilters.flow;
    if (managerOnlyReview) {
      const team = managerTeamEmails;
      const emailCsv = Array.from(team).filter(Boolean).join(",");
      const skipEarn = teamFlow === "USAGE";
      const skipUsage = earnOnly || teamFlow === "EARN" || !emailCsv;
      const [earnSettled, usageSettled] = await Promise.allSettled([
        skipEarn
          ? Promise.resolve([] as Array<Record<string, unknown>>)
          : compOffService
              .listEarnRequests({ fromDate: from, toDate: to, managerOnly: true })
              .then((res) => compOffService.parseRequestRows(res).map(mapEarnListRow)),
        skipUsage
          ? Promise.resolve([] as Array<Record<string, unknown>>)
          : compOffService.listRequests({
              fromDate: from,
              toDate: to,
              requestType: COMP_OFF_USAGE_LIST_TYPE,
              empEmails: emailCsv,
            }).then((res) => compOffService.parseRequestRows(res)),
      ]);
      const earnRows =
        earnSettled.status === "fulfilled" ? earnSettled.value : [];
      const usageRows =
        usageSettled.status === "fulfilled" ? usageSettled.value : [];
      if (opts?.raiseOnError) {
        if (!skipEarn && earnSettled.status === "rejected") throw earnSettled.reason;
        if (!skipUsage && usageSettled.status === "rejected") throw usageSettled.reason;
      }
      let merged: Array<Record<string, unknown>> = [...earnRows, ...usageRows];
      merged = merged.filter((row) => {
        const t = normalizeCompOffRequestType(row.request_type ?? row.requestType);
        if (teamFlow === "EARN") return t === "COMP_OFF_EARN";
        if (teamFlow === "USAGE") return t === "COMP_OFF";
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

    const earnTypes = teamFlow === "USAGE" ? [] : [COMP_OFF_EARN_LIST_TYPE];
    const usageTypes = earnOnly || teamFlow === "EARN" ? [] : [COMP_OFF_USAGE_LIST_TYPE];
    const types = [...earnTypes, ...usageTypes];
    if (!types.length && !hasHrAccess) {
      setTeamEmployeeNames({});
      setTeamRequests([]);
      return;
    }
    let merged: Array<Record<string, unknown>> = [];
    if (hasHrAccess) {
      const skipEarn = teamFlow === "USAGE";
      const skipUsage = earnOnly || teamFlow === "EARN";
      const [earnSettled, usageSettled] = await Promise.allSettled([
        skipEarn
          ? Promise.resolve([] as Array<Record<string, unknown>>)
          : compOffService
              .listEarnRequests({ fromDate: from, toDate: to })
              .then((res) => compOffService.parseRequestRows(res).map(mapEarnListRow)),
        skipUsage
          ? Promise.resolve([] as Array<Record<string, unknown>>)
          : compOffService.fetchHrTeamRequests({
              fromDate: from,
              toDate: to,
              requestTypes: [COMP_OFF_USAGE_LIST_TYPE],
            }),
      ]);
      const earnRows = earnSettled.status === "fulfilled" ? earnSettled.value : [];
      const usageRows = usageSettled.status === "fulfilled" ? usageSettled.value : [];
      if (opts?.raiseOnError) {
        if (!skipEarn && earnSettled.status === "rejected") throw earnSettled.reason;
        if (!skipUsage && usageSettled.status === "rejected") throw usageSettled.reason;
      }
      merged = [...earnRows, ...usageRows];
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
      if (teamFlow === "EARN") return t === "COMP_OFF_EARN";
      if (teamFlow === "USAGE") return t === "COMP_OFF";
      return true;
    });
    const seen = new Set<string>();
    merged = merged.filter((row) => {
      const id = requestRowId(row);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    await applyTeamRequests(merged);
    } catch (error) {
      setTeamEmployeeNames({});
      setTeamRequests([]);
      if (opts?.raiseOnError) throw error;
    }
  }, [
    teamFilters,
    hasHrAccess,
    managerOnlyReview,
    managerTeamEmails,
    userEmail,
    accountManagerEmails,
    applyTeamRequests,
  ]);

  function openRejectDialog(requestId: string, flow: "COMP_OFF_EARN" | "COMP_OFF") {
    setRejectReason("");
    setPendingReject({ requestId, flow });
  }

  async function confirmRejectRequest() {
    if (!pendingReject) return;
    const reason = rejectReason.trim();
    if (!reason) throw new Error("Reason is required when rejecting a request.");
    await decideTeamRequest(pendingReject.requestId, pendingReject.flow, "REJECTED", reason);
    setPendingReject(null);
    setRejectReason("");
    await loadTeamRequests();
  }

  useEffect(() => {
    if (!canApplyCompOff) return;
    void loadBalanceAndGrants();
    void loadAssignedProjects();
    void loadMyRequests();
  }, [canApplyCompOff, loadBalanceAndGrants, loadAssignedProjects, loadMyRequests]);

  useEffect(() => {
    if (balanceUnits === null && grants.length === 0 && !grantsLoading) {
      void loadProfileBalanceFallback();
    }
  }, [balanceUnits, grants.length, grantsLoading, loadProfileBalanceFallback]);

  useEffect(() => {
    const onTeam = forcedTab === "team" || mainTab === "team";
    if (!onTeam || (!hasManagerAccess && !hasHrAccess)) return;
    if (managerOnlyReview && managerPortfolioLoading) return;
    void loadTeamRequests().catch(() => undefined);
  }, [
    forcedTab,
    mainTab,
    teamFilters.from,
    teamFilters.to,
    teamFilters.flow,
    hasManagerAccess,
    hasHrAccess,
    managerOnlyReview,
    managerPortfolioLoading,
    loadTeamRequests,
    earnOnly,
  ]);

  useEffect(() => {
    if (!embedded || forcedTab !== "team" || teamReloadKey === undefined) return;
    if (!hasManagerAccess && !hasHrAccess) return;
    if (managerOnlyReview && managerPortfolioLoading) return;
    void loadTeamRequests().catch(() => undefined);
  }, [
    embedded,
    forcedTab,
    teamReloadKey,
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
    const workedDates = earnForm.worked_dates.map((d) => normalizeToApiDate(d.trim())).filter(Boolean);
    const projectCode = earnForm.project_code.trim();
    let managerEmail = earnForm.manager_comp_off_email.trim().toLowerCase();
    if (!managerEmail && selectedProject?.managerEmail) {
      managerEmail = selectedProject.managerEmail;
    }
    if (!managerEmail && projectCatalog) {
      managerEmail = await resolveCompOffManagerEmail(projectCode, projectCatalog);
    }
    const comments = earnForm.comments.trim();
    if (!projectCode) throw new Error("Project is required.");
    if (!workedDates.length) throw new Error("At least one weekend worked date is required.");
    for (const workedDate of workedDates) {
      if (!isWeekendYmd(workedDate)) {
        throw new Error("Worked dates must be weekends (Saturday or Sunday).");
      }
    }
    if (!comments) throw new Error("Comments are required.");
    if (comments.length > 2000) throw new Error("Comments must be 2000 characters or less.");
    if (editingRequestId) {
      throw new Error("Editing earn requests is not supported. Revoke and submit a new earn request.");
    }
    for (const workedDate of workedDates) {
      await compOffService.createEarnRequest({
        worked_date: workedDate,
        workedDate,
        project_code: projectCode,
        projectCode,
        work_description: comments,
        workDescription: comments,
      });
    }
    setEarnForm({ worked_dates: [], project_code: "", manager_comp_off_email: "", comments: "" });
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
  const showMyCompOff =
    !earnOnly || forcedTab !== "team"
      ? forcedTab === "my" || (!forcedTab && canApplyCompOff && mainTab !== "team")
      : false;
  const showTeamReview =
    forcedTab === "team" ||
    (earnOnly && embedded && canReviewTeam) ||
    (!earnOnly && !forcedTab && canReviewTeam && (!canApplyCompOff || mainTab === "team"));

  const pageBody = (
    <section className="space-y-4">
      {!embedded ? <h2 className="text-xl font-semibold text-wt-text">Comp-off</h2> : null}

      {!embedded && canApplyCompOff && canReviewTeam ? (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm">Comp-off balance</h3>
                        {earnOnly && canApplyCompOff ? (
                          <p className="text-xs text-wt-text-muted mt-1">
                            To use balance, submit a <strong>Comp off</strong> request under{" "}
                            <strong>Leave requests</strong>.
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-semibold text-wt-text">{displayBalance}</p>
                        <p className="text-xs text-wt-text-muted">unit{displayBalance === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm">Next expiry</h3>
                        <p className="text-xs text-wt-text-muted mt-1">Nearest credit expiry date</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-semibold text-wt-text">
                          {nearestExpiryDate ? formatApiDateDisplay(nearestExpiryDate) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`grid gap-4 ${earnOnly ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
                  <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
                    <div>
                      <h3 className="font-semibold">Earn credit</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ProjectSelectField
                        label="Project"
                        required
                        value={earnForm.project_code}
                        options={projectOptions}
                        onChange={onEarnProjectChange}
                      />
                      <WeekendMultiDateField
                        label="Worked date"
                        required
                        value={earnForm.worked_dates}
                        onChange={(dates) => setEarnForm((p) => ({ ...p, worked_dates: dates }))}
                        maxDates={2}
                      />
                    </div>
                    <TextAreaField
                      label="Comments"
                      required
                      value={earnForm.comments}
                      onChange={(v) => setEarnForm((p) => ({ ...p, comments: v }))}
                    />
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      disabled={
                        actionLoading ||
                        !earnForm.project_code.trim() ||
                        !earnForm.worked_dates.length ||
                        !earnForm.comments.trim() ||
                        managerEmailResolving
                      }
                      onClick={() =>
                        runAction(compOffEarnActionLabel(editingRequestId ? "update" : "submit"), submitEarn)
                      }
                    >
                      {editingRequestId ? "Save earn request" : "Submit earn request"}
                    </button>
                  </div>

                  {!earnOnly ? (
                  <div
                    className={`rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3 ${
                      !canUseCompOff ? "opacity-75" : ""
                    }`}
                  >
                    <div>
                      <h3 className="font-semibold">Use comp-off</h3>
                      <p className="text-xs text-wt-text-muted mt-1">
                        To use comp-off balance, submit a request from{" "}
                        <strong>My leave requests</strong>.
                      </p>
                    </div>
                  </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{earnOnly ? "My earn requests" : "My requests"}</h3>
                    <div className="flex items-end gap-2">
                      {!earnOnly ? (
                      <SelectField
                        label="Flow"
                        value={myRequestsFlowFilter}
                        options={["ALL", "EARN", "USAGE"]}
                        onChange={(v) =>
                          setMyRequestsFlowFilter(v as "ALL" | "EARN" | "USAGE")
                        }
                      />
                      ) : null}
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
                            {earnOnly ? (
                              <>
                                <th className="text-left px-3 py-2 font-medium">Project</th>
                                <th className="text-left px-3 py-2 font-medium">Worked date</th>
                              </>
                            ) : (
                              <>
                                <th className="text-left px-3 py-2 font-medium">Type</th>
                                <th className="text-left px-3 py-2 font-medium">From</th>
                                <th className="text-left px-3 py-2 font-medium">To</th>
                              </>
                            )}
                            <th className="text-left px-3 py-2 font-medium">Status</th>
                            <th className="text-left px-3 py-2 font-medium">Manager status</th>
                            {!earnOnly ? (
                              <>
                                <th className="text-left px-3 py-2 font-medium">Manager reason</th>
                                <th className="text-left px-3 py-2 font-medium">HR status</th>
                              </>
                            ) : null}
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
                            const mgrStatus =
                              flow === "COMP_OFF_EARN"
                                ? requestEarnManagerStatus(row)
                                : requestManagerStatus(row);
                            const mgrReason = earnOnly
                              ? "—"
                              : formatStageRejectionReason(
                                  mgrStatus,
                                  pickRowField(row, "manager_reason", "managerReason")
                                );
                            const hrSt =
                              !earnOnly && flow === "COMP_OFF" ? requestHrStatus(row) : "—";
                            return (
                              <tr key={`${id || idx}`} className="border-t border-wt-border">
                                {earnOnly ? (
                                  <>
                                    <td className="px-3 py-2 whitespace-nowrap">{earnProjectLabel(row)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      {String(
                                        pickRowField(
                                          row,
                                          "worked_date",
                                          "workedDate",
                                          "request_from_date",
                                          "requestFromDate"
                                        ) ?? "—"
                                      )}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-3 py-2 whitespace-nowrap">{requestTypeLabel(flow)}</td>
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
                                  </>
                                )}
                                <td className="px-3 py-2 whitespace-nowrap">{status}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{mgrStatus}</td>
                                {!earnOnly ? (
                                  <>
                                    <td
                                      className="px-3 py-2 max-w-[140px] truncate"
                                      title={mgrReason !== "—" ? mgrReason : undefined}
                                    >
                                      {mgrReason}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      {flow === "COMP_OFF" ? hrSt : "—"}
                                    </td>
                                  </>
                                ) : null}
                                <td className="px-3 py-2 max-w-[200px] truncate">
                                  {String(
                                    pickRowField(
                                      row,
                                      "comments",
                                      "comment",
                                      "description",
                                      "remarks",
                                      "work_description",
                                      "workDescription"
                                    ) ?? "—"
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
                <div className="flex flex-wrap items-end gap-3">
                  {!useParentTeamDates ? (
                    <>
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
                    </>
                  ) : null}
                  {(managerOnlyReview || hasHrAccess) && !earnOnly ? (
                    <SelectField
                      label="Flow"
                      value={teamFilters.flow}
                      options={[
                        { value: "ALL", label: "All" },
                        { value: "EARN", label: "Earn credit" },
                        { value: "USAGE", label: "Usage" },
                      ]}
                      onChange={(v) =>
                        setTeamFilters((p) => ({
                          ...p,
                          flow: v as "ALL" | "EARN" | "USAGE",
                        }))
                      }
                    />
                  ) : null}
                  <button
                    type="button"
                    className="btn-primary px-3 py-2 h-10"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction(compOffTeamReviewActionLabel("COMP_OFF", "fetch"), () =>
                        loadTeamRequests({ raiseOnError: true })
                      )
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
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Type</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">From</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">To</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Description</th>
                          {isHrOnly ? (
                            <>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Status</th>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Manager status</th>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Manager reason</th>
                            </>
                          ) : (
                            <>
                              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Manager status</th>
                              {!managerOnlyReview ? (
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Manager reason</th>
                              ) : null}
                              {hasHrAccess ? (
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">HR status</th>
                              ) : null}
                              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Actions</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {teamRequests.map((row, idx) => {
                          const id = requestRowId(row);
                          const flow = normalizeCompOffRequestType(
                            row.request_type ?? row.requestType
                          );
                          const finalStatus = requestFinalStatus(row);
                          const managerStatus =
                            flow === "COMP_OFF_EARN"
                              ? requestEarnManagerStatus(row)
                              : requestManagerStatus(row);
                          const managerReason = formatStageRejectionReason(
                            managerStatus,
                            pickRowField(row, "manager_reason", "managerReason")
                          );
                          const hrStatus = requestHrStatus(row);
                          const rowEmail = requestRowEmail(row);
                          const isAm = rowEmail ? accountManagerEmails.has(rowEmail) : false;
                          const routedManager = String(
                            pickRowField(row, "manager_comp_off_email", "managerCompOffEmail") ?? ""
                          )
                            .trim()
                            .toLowerCase();
                          const managerRoutedOk =
                            hasManagerAccess &&
                            ((userEmail && routedManager === userEmail) ||
                              (rowEmail ? managerTeamEmails.has(rowEmail) : false));
                          const isRowUpdating = teamRequestUpdatingId === id;
                          const canManagerActEarn =
                            flow === "COMP_OFF_EARN" &&
                            hasManagerAccess &&
                            !isHrOnly &&
                            managerStatus === "PENDING" &&
                            managerRoutedOk;
                          const canManagerActUsage =
                            flow === "COMP_OFF" &&
                            hasManagerAccess &&
                            managerStatus === "PENDING" &&
                            managerRoutedOk;
                          const canHrActUsage =
                            hasHrAccess &&
                            flow === "COMP_OFF" &&
                            canHrActOnCompOff(row, { hasHrAccess });
                          const canReview =
                            !isRowUpdating &&
                            (canManagerActEarn || canManagerActUsage || canHrActUsage);
                          const tone = (s: string) =>
                            s === "APPROVED"
                              ? "text-emerald-700"
                              : s === "REJECTED"
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
                              <td className="px-3 py-2 whitespace-nowrap">{requestTypeLabel(flow)}</td>
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
                              <td
                                className="px-3 py-2 max-w-[200px] truncate"
                                title={String(
                                  pickRowField(row, "comments", "comment", "description", "remarks") ?? ""
                                )}
                              >
                                {String(
                                  pickRowField(row, "comments", "comment", "description", "remarks") ?? "—"
                                )}
                              </td>
                              {isHrOnly ? (
                                <>
                                  <td className={`px-3 py-2 whitespace-nowrap font-medium ${tone(finalStatus)}`}>
                                    {finalStatus}
                                  </td>
                                  <td className={`px-3 py-2 whitespace-nowrap font-medium ${tone(managerStatus)}`}>
                                    {managerStatus}
                                  </td>
                                  <td
                                    className="px-3 py-2 max-w-[180px] truncate"
                                    title={managerReason !== "—" ? managerReason : undefined}
                                  >
                                    {managerReason}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className={`px-3 py-2 whitespace-nowrap font-medium ${tone(managerStatus)}`}>
                                    {managerStatus}
                                  </td>
                                  {!managerOnlyReview ? (
                                    <td
                                      className="px-3 py-2 max-w-[180px] truncate"
                                      title={managerReason !== "—" ? managerReason : undefined}
                                    >
                                      {managerReason}
                                    </td>
                                  ) : null}
                                  {hasHrAccess ? (
                                    <td className={`px-3 py-2 whitespace-nowrap font-medium ${tone(hrStatus)}`}>
                                      {flow === "COMP_OFF" ? hrStatus : "—"}
                                    </td>
                                  ) : null}
                                  <td className="px-3 py-2 text-right whitespace-nowrap">
                                    {canReview && flow ? (
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          className="rounded-lg px-2.5 py-1.5 text-xs border border-emerald-600/25 text-emerald-800 bg-emerald-50/40 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                          disabled={!id || isRowUpdating}
                                          onClick={() =>
                                            runAction(
                                              compOffTeamReviewActionLabel(flow, "approve"),
                                              async () => {
                                                await decideTeamRequest(id, flow, "APPROVED");
                                                await loadTeamRequests();
                                              }
                                            )
                                          }
                                        >
                                          {isRowUpdating ? "…" : "Approve"}
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded-lg px-2.5 py-1.5 text-xs border border-rose-600/25 text-rose-800 bg-rose-50/40 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                          disabled={!id || isRowUpdating}
                                          onClick={() => openRejectDialog(id, flow)}
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-wt-text-muted">—</span>
                                    )}
                                  </td>
                                </>
                              )}
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
  );

  const rejectDialog = (
    <UserRequestRejectDialog
      open={Boolean(pendingReject)}
      title={
        pendingReject?.flow === "COMP_OFF_EARN"
          ? "Reject earn request"
          : "Reject comp-off usage"
      }
      description={
        pendingReject?.flow === "COMP_OFF_EARN"
          ? "A reason is required. Only the project manager can reject earn requests."
          : "A reason is required when rejecting. Both manager and HR must approve usage before balance is consumed."
      }
      reasonPlaceholder="Enter rejection reason"
      confirmLabel="Reject"
      confirmingLabel="Rejecting…"
      reason={rejectReason}
      onReasonChange={setRejectReason}
      onCancel={() => {
        setPendingReject(null);
        setRejectReason("");
      }}
      onConfirm={() =>
        runAction(
          pendingReject?.flow === "COMP_OFF_EARN"
            ? "Reject earn request"
            : "Reject comp-off usage",
          confirmRejectRequest
        )
      }
      loading={actionLoading}
    />
  );

  if (embedded) {
    return (
      <>
        <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>{pageBody}</OnboardingGate>
        {rejectDialog}
        <DashboardToast toast={toast} />
      </>
    );
  }

  return (
    <>
      <DashboardPageShell>
        <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>{pageBody}</OnboardingGate>
      </DashboardPageShell>
      {rejectDialog}
      <DashboardToast toast={toast} />
    </>
  );
}
