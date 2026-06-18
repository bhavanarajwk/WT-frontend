import { ApiError } from "@/api/error";

import { apiClient } from "@/api/httpClient";

import { endpoints } from "@/api/endpoints";

import type { ApiEnvelope } from "@/api/httpClient";

import type { ApprovalStage } from "@/types/userRequest";

import { applyApiDateQuery, toApiDateParam } from "@/utils/apiDate";

import { toPagedRows } from "@/utils/apiRows";

import {

  isAlreadyActedOnRequestError,

  normalizeRequestStatus,

  pickRowField,

} from "@/utils/compOff";



export type UserRequestStatusValue = ApprovalStage;

/** Canonical request types for list fetches — avoid duplicate alias calls (COMPOFF, COMP-OFF, etc.). */
export const USER_REQUEST_FETCH_TYPES = ["LEAVE", "WFH", "COMP_OFF"] as const;

function dedupeUserRequestRows(
  rows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return Array.from(
    new Map(
      rows.map((row) => {
        const key = String(
          pickRowField(
            row,
            "user_request_id",
            "userRequestId",
            "request_id",
            "requestId",
            "id"
          ) ?? Math.random()
        );
        return [key, row] as const;
      })
    ).values()
  );
}

export function resolveRequestTypesForFetch(requestType: string): string[] {
  const normalized = requestType.trim().toUpperCase() || "ALL";
  if (normalized === "ALL") return ["ALL"];
  if (normalized === "LEAVE") return ["LEAVE"];
  if (normalized === "WFH") return ["WFH"];
  if (
    normalized === "COMP_OFF" ||
    normalized === "COMPOFF" ||
    normalized === "COMP-OFF" ||
    normalized === "COMP OFF"
  ) {
    return ["COMP_OFF"];
  }
  return [requestType.trim()];
}

async function fetchUserRequestPathPages(params: {
  fromDate: string;
  toDate: string;
  requestTypes: string[];
  empEmails?: string;
  extraQuery?: Record<string, string>;
}): Promise<Array<Record<string, unknown>>> {
  const normalizedFrom = toApiDateParam(params.fromDate) ?? params.fromDate.trim();
  const normalizedTo = toApiDateParam(params.toDate) ?? params.toDate.trim();
  const query = { page: "0", size: "200", ...params.extraQuery };
  const email = params.empEmails?.trim();
  const collected: Array<Record<string, unknown>> = [];

  for (const requestType of params.requestTypes) {
    const paths: string[] = [];
    if (email) {
      paths.push(
        endpoints.userRequest.getByEmployees(email, normalizedFrom, normalizedTo, requestType)
      );
    }
    paths.push(endpoints.userRequest.getRange(normalizedFrom, normalizedTo, requestType));

    for (const path of paths) {
      try {
        const res = await apiClient.get<ApiEnvelope<unknown>>(path, { query });
        collected.push(...toPagedRows(res.data ?? res));
      } catch {
        /* try next path/type */
      }
    }
  }

  return dedupeUserRequestRows(collected);
}

/** Team / scoped lists — prefer a single ALL call, then canonical types only. */
export async function listScopedUserRequests(params: {
  fromDate: string;
  toDate: string;
  requestType?: string;
  empEmails?: string;
}): Promise<Array<Record<string, unknown>>> {
  const primaryTypes = resolveRequestTypesForFetch(params.requestType ?? "ALL");

  if (primaryTypes[0] === "ALL") {
    const allRows = await fetchUserRequestPathPages({
      fromDate: params.fromDate,
      toDate: params.toDate,
      requestTypes: ["ALL"],
      empEmails: params.empEmails,
    });
    if (allRows.length) return allRows;
    return fetchUserRequestPathPages({
      fromDate: params.fromDate,
      toDate: params.toDate,
      requestTypes: [...USER_REQUEST_FETCH_TYPES],
      empEmails: params.empEmails,
    });
  }

  return fetchUserRequestPathPages({
    fromDate: params.fromDate,
    toDate: params.toDate,
    requestTypes: primaryTypes,
    empEmails: params.empEmails,
  });
}



export const STAGE_USER_REQUEST_TYPES = ["LEAVE", "WFH", "COMP_OFF"] as const;



export type StageUserRequestType = (typeof STAGE_USER_REQUEST_TYPES)[number];



export function isStageUserRequestType(value: unknown): boolean {

  const raw = String(value ?? "")

    .trim()

    .toUpperCase()

    .replace(/[\s-]+/g, "_");

  return (STAGE_USER_REQUEST_TYPES as readonly string[]).includes(raw);

}



export function isLeaveOrWfhRequestType(value: unknown): boolean {

  const raw = String(value ?? "")

    .trim()

    .toUpperCase();

  return raw === "LEAVE" || raw === "WFH";

}



export function isCompOffRequestType(value: unknown): boolean {

  const raw = String(value ?? "")

    .trim()

    .toUpperCase()

    .replace(/[\s-]+/g, "_");

  return raw === "COMP_OFF" || raw === "COMPOFF" || raw === "COMP-OFF";

}



export function isPendingApprovalStage(value: unknown): boolean {

  const normalized = normalizeRequestStatus(value);

  return normalized === "PENDING" || normalized === "";

}



export function requestManagerStatus(row: Record<string, unknown>): string {

  return normalizeRequestStatus(

    pickRowField(row, "manager_status", "managerStatus") ?? "PENDING"

  );

}



export function requestHrStatus(row: Record<string, unknown>): string {

  return normalizeRequestStatus(pickRowField(row, "hr_status", "hrStatus") ?? "PENDING");

}



export function requestFinalStatus(row: Record<string, unknown>): string {

  return normalizeRequestStatus(

    pickRowField(row, "user_request_status", "userRequestStatus", "status") ?? "PENDING"

  );

}



/** HR toggle value for LEAVE/WFH — prefer hr_status, fall back to status. */

export function hrToggleStatusFromRow(row: Record<string, unknown>): UserRequestStatusValue {

  const requestType = pickRowField(row, "request_type", "requestType");

  if (isLeaveOrWfhRequestType(requestType)) {

    const hr = requestHrStatus(row);

    if (hr === "APPROVED" || hr === "REJECTED" || hr === "PENDING") return hr;

  }

  const final = requestFinalStatus(row);

  if (final === "APPROVED" || final === "REJECTED" || final === "PENDING") return final;

  return "PENDING";

}



export function isManagerApprovedForHr(row: Record<string, unknown>): boolean {

  return requestManagerStatus(row) === "APPROVED";

}



/** HR may act only after manager approved and final status is still pending. */

export function canHrReviewUserRequest(

  row: Record<string, unknown>,

  options: { hasHrAccess: boolean }

): boolean {

  if (!options.hasHrAccess) return false;

  if (!isManagerApprovedForHr(row)) return false;

  return requestFinalStatus(row) === "PENDING";

}



export function canHrToggleLeaveWfh(

  row: Record<string, unknown>,

  options: { hasHrAccess: boolean }

): boolean {

  if (!options.hasHrAccess) return false;

  if (!isLeaveOrWfhRequestType(pickRowField(row, "request_type", "requestType"))) return false;

  return canHrReviewUserRequest(row, options);

}



/** HR on COMP_OFF usage: approve/reject only after manager approved. */

export function canHrActOnCompOff(

  row: Record<string, unknown>,

  options: { hasHrAccess: boolean }

): boolean {

  if (!options.hasHrAccess) return false;

  if (!isCompOffRequestType(pickRowField(row, "request_type", "requestType"))) return false;

  if (!canHrReviewUserRequest(row, options)) return false;

  return isPendingApprovalStage(requestHrStatus(row));

}

/** HR team table: show Approve/Reject for leave/WFH or comp-off usage. */

export function canHrShowTeamRequestActions(
  row: Record<string, unknown>,
  options: { hasHrAccess: boolean }
): boolean {
  return canHrToggleLeaveWfh(row, options) || canHrActOnCompOff(row, options);
}

export function hrTeamActionBlockedHint(

  row: Record<string, unknown>,

  options: { hasHrAccess: boolean }

): string | null {

  if (!options.hasHrAccess) return null;

  const requestType = pickRowField(row, "request_type", "requestType");

  if (!isLeaveOrWfhRequestType(requestType) && !isCompOffRequestType(requestType)) {

    return null;

  }

  if (canHrToggleLeaveWfh(row, options) || canHrActOnCompOff(row, options)) {

    return null;

  }

  const mgr = requestManagerStatus(row);

  if (mgr === "PENDING") return "Awaiting manager/DM approval";

  if (mgr === "REJECTED") return "Manager rejected";

  return null;

}



export function canManagerActOnRequest(
  row: Record<string, unknown>,
  options: { hasManagerAccess: boolean; hasDmAccess?: boolean }
): boolean {
  const hasManager = Boolean(options.hasManagerAccess);
  const hasDm = Boolean(options.hasDmAccess);
  if (!hasManager && !hasDm) return false;

  const requestType = pickRowField(row, "request_type", "requestType");
  if (!isStageUserRequestType(requestType)) {
    return requestFinalStatus(row) === "PENDING";
  }
  if (!isPendingApprovalStage(requestManagerStatus(row))) {
    return false;
  }
  // DM-only users approve manager leave/WFH; PMs never see those in their scoped list.
  if (hasDm && !hasManager) return true;
  return hasManager;
}



export function canManagerRejectRequest(

  row: Record<string, unknown>,

  options: { hasManagerAccess: boolean; hasDmAccess?: boolean }

): boolean {

  if (!canManagerActOnRequest(row, options)) return false;

  const requestType = pickRowField(row, "request_type", "requestType");

  if (isLeaveOrWfhRequestType(requestType) && requestFinalStatus(row) === "APPROVED") {

    return false;

  }

  return true;

}



/** @deprecated Use canManagerActOnRequest / canHrToggleLeaveWfh */

export function canApproverActOnRequest(

  row: Record<string, unknown>,

  options: { hasHrAccess: boolean; hasManagerAccess?: boolean; hasDmAccess?: boolean }

): boolean {

  if (options.hasHrAccess) {

    return canHrToggleLeaveWfh(row, options) || canHrActOnCompOff(row, options);

  }

  return canManagerActOnRequest(row, {
    hasManagerAccess: Boolean(options.hasManagerAccess),
    hasDmAccess: Boolean(options.hasDmAccess),
  });

}



/** PUT /api/v1/userRequest/status */

export async function updateUserRequestStatus(

  userRequestId: number,

  status: UserRequestStatusValue,

  options?: { reason?: string; requireReasonOnReject?: boolean }

): Promise<ApiEnvelope<unknown>> {

  const idNum = Number(userRequestId);

  if (!Number.isFinite(idNum) || idNum <= 0) {

    throw new Error("Invalid request id.");

  }

  const requireReason = options?.requireReasonOnReject ?? false;

  const trimmedReason = options?.reason?.trim() ?? "";

  if (status === "REJECTED" && requireReason && !trimmedReason) {

    throw new Error("Reason is required when rejecting a request.");

  }



  const body: Record<string, unknown> = {

    user_request_id: idNum,

    userRequestId: idNum,

    user_request_status: status,

    userRequestStatus: status,

  };

  if (status === "REJECTED" && requireReason && trimmedReason) {

    body.reason = trimmedReason;

    body.message = trimmedReason;

  }



  try {

    return await apiClient.put<ApiEnvelope<unknown>>(endpoints.userRequest.status, {

      contentType: "application/json",

      body: JSON.stringify(body),

    });

  } catch (firstError) {

    if (isAlreadyActedOnRequestError(firstError)) {

      return { message: "ok", data: null } as ApiEnvelope<unknown>;

    }

    if (status === "PENDING") {

      throw firstError;

    }

    try {

      const legacyStatus =

        status === "APPROVED" ? "APPROVE" : status === "REJECTED" ? "REJECT" : status;

      const legacy: Record<string, unknown> = {

        user_request_id: idNum,

        user_request_status: legacyStatus,

      };

      if (status === "REJECTED" && requireReason && trimmedReason) {

        legacy.reason = trimmedReason;

        legacy.message = trimmedReason;

      }

      return await apiClient.put<ApiEnvelope<unknown>>(endpoints.userRequest.status, {

        contentType: "application/json",

        body: JSON.stringify(legacy),

      });

    } catch (secondError) {

      if (isAlreadyActedOnRequestError(secondError)) {

        return { message: "ok", data: null } as ApiEnvelope<unknown>;

      }

      throw firstError;

    }

  }

}



export function mergeStatusUpdateIntoRow(

  row: Record<string, unknown>,

  data: Record<string, unknown> | null | undefined

): Record<string, unknown> {

  if (!data || typeof data !== "object") return row;

  return { ...row, ...data };

}



export function extractStatusUpdateData(envelope: ApiEnvelope<unknown>): Record<string, unknown> | null {

  const data = envelope?.data;

  if (data && typeof data === "object" && !Array.isArray(data)) {

    return data as Record<string, unknown>;

  }

  return null;

}



export function formatApprovalStageLabel(value: unknown): string {

  const s = normalizeRequestStatus(value);

  return s || "—";

}



export function approvalStageTone(value: unknown): string {

  const s = normalizeRequestStatus(value);

  if (s === "APPROVED") return "text-emerald-700";

  if (s === "REJECTED") return "text-rose-700";

  return "text-wt-text";

}



/** Show rejection reason only when the stage status is REJECTED (manager / legacy HR). */

export function formatStageRejectionReason(stage: unknown, reason: unknown): string {

  if (normalizeRequestStatus(stage) !== "REJECTED") return "—";

  const text = String(reason ?? "").trim();

  return text || "—";

}



/** GET /api/v1/userRequest?...&selfOnly=true — logged-in user's requests with approval fields. */

export async function listSelfUserRequests(params: {

  fromDate: string;

  toDate: string;

  requestType?: string;

  page?: number;

  size?: number;

  empEmail?: string;

}): Promise<Array<Record<string, unknown>>> {

  const normalizedFrom = toApiDateParam(params.fromDate) ?? params.fromDate.trim();

  const normalizedTo = toApiDateParam(params.toDate) ?? params.toDate.trim();

  const requestType = params.requestType?.trim() || "ALL";

  const page = params.page ?? 0;

  const size = params.size ?? 200;

  const selfOnlyQuery = {

    fromDate: normalizedFrom,

    toDate: normalizedTo,

    requestType,

    selfOnly: "true",

    page: String(page),

    size: String(size),

  };



  const parse = (res: ApiEnvelope<unknown>) => toPagedRows(res.data ?? res);



  try {

    const res = await apiClient.get<ApiEnvelope<unknown>>(endpoints.userRequest.root, {

      query: applyApiDateQuery(selfOnlyQuery, ["fromDate", "toDate"]),

    });

    return parse(res);

  } catch (error) {

    if (!(error instanceof ApiError) || (error.status !== 405 && error.status !== 404)) {

      throw error;

    }

  }



  const email = params.empEmail?.trim();

  const legacyRows = await fetchUserRequestPathPages({
    fromDate: params.fromDate,
    toDate: params.toDate,
    requestTypes: resolveRequestTypesForFetch(requestType),
    empEmails: email,
    extraQuery: { selfOnly: "true" },
  });

  if (legacyRows.length) return legacyRows;

  if (requestType === "ALL") {
    return fetchUserRequestPathPages({
      fromDate: params.fromDate,
      toDate: params.toDate,
      requestTypes: [...USER_REQUEST_FETCH_TYPES],
      empEmails: email,
      extraQuery: { selfOnly: "true" },
    });
  }

  return legacyRows;

}


