import { endpoints } from "@/api/endpoints";
import { ApiError } from "@/api/error";
import { apiClient, type ApiEnvelope } from "@/api/httpClient";
import { hrmsService } from "@/services/hrms.service";
import type { CompOffBalanceData, CompOffGrant } from "@/types/compOff";
import { applyApiDateFields, applyApiDateQuery, toApiDateParam } from "@/utils/apiDate";
import { dedupeCompOffRequestRows, isAlreadyActedOnRequestError } from "@/utils/compOff";
import { toPagedRows, toRows } from "@/utils/apiRows";
import { emailFromOnboardRow } from "@/utils/learning/onboardOptions";

async function listRequestsByTypes(params: {
  fromDate: string;
  toDate: string;
  requestTypes: string[];
  empEmails?: string;
}): Promise<Array<Record<string, unknown>>> {
  const { fromDate, toDate, requestTypes, empEmails } = params;
  const responses = await Promise.allSettled(
    requestTypes.map((requestType) =>
      compOffService.listRequests({ fromDate, toDate, requestType, empEmails })
    )
  );
  return dedupeCompOffRequestRows(
    responses
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof compOffService.listRequests>>> =>
          r.status === "fulfilled"
      )
      .flatMap((r) => compOffService.parseRequestRows(r.value))
  );
}

export const compOffService = {
  createEarnRequest(body: Record<string, unknown>) {
    const payload = applyApiDateFields(body, [
      "request_from_date",
      "request_to_date",
      "from_date",
      "to_date",
    ]);
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.compOff.earn, {
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  },

  listEarnRequests(params: {
    fromDate: string;
    toDate: string;
    page?: number;
    size?: number;
  }) {
    const { fromDate, toDate, page = 0, size = 200 } = params;
    return apiClient.get<ApiEnvelope<unknown>>(endpoints.compOff.earn, {
      query: applyApiDateQuery(
        {
          page: String(page),
          size: String(size),
          fromDate,
          toDate,
        },
        ["fromDate", "toDate"]
      ),
    });
  },

  getBalance(asOfDate?: string) {
    const normalized = toApiDateParam(asOfDate);
    const query: Record<string, string> = {};
    if (normalized) {
      query.asOfDate = normalized;
      query.as_of_date = normalized;
    }
    return apiClient.get<ApiEnvelope<CompOffBalanceData>>(endpoints.compOff.balance, {
      query: Object.keys(query).length ? query : undefined,
    });
  },

  getGrants(empId?: string) {
    const path = empId?.trim()
      ? endpoints.compOff.grantsForEmployee(empId.trim())
      : endpoints.compOff.grants;
    return apiClient.get<ApiEnvelope<CompOffGrant[] | { grants?: CompOffGrant[] }>>(path);
  },

  parseGrantsResponse(res: ApiEnvelope<unknown>): CompOffGrant[] {
    const data = res.data;
    if (Array.isArray(data)) return data as CompOffGrant[];
    if (data && typeof data === "object") {
      const grants = (data as { grants?: unknown }).grants;
      if (Array.isArray(grants)) return grants as CompOffGrant[];
      return toRows(data) as CompOffGrant[];
    }
    return [];
  },

  parseBalanceResponse(res: ApiEnvelope<unknown>): CompOffBalanceData | null {
    const data = res.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as CompOffBalanceData;
    }
    return null;
  },

  listRequests(params: {
    fromDate: string;
    toDate: string;
    requestType: string;
    empEmails?: string;
    page?: number;
    size?: number;
  }) {
    const { fromDate, toDate, requestType, empEmails, page = 0, size = 200 } = params;
    const normalizedFrom = toApiDateParam(fromDate) ?? fromDate.trim();
    const normalizedTo = toApiDateParam(toDate) ?? toDate.trim();
    return apiClient
      .get<ApiEnvelope<unknown>>(endpoints.userRequest.root, {
        query: applyApiDateQuery(
          {
            fromDate: normalizedFrom,
            toDate: normalizedTo,
            requestType,
            page: String(page),
            size: String(size),
          },
          ["fromDate", "toDate"]
        ),
      })
      .catch((error) => {
        if (!(error instanceof ApiError) || error.status !== 405) throw error;
        const path = empEmails?.trim()
          ? endpoints.userRequest.getByEmployees(
              empEmails,
              normalizedFrom,
              normalizedTo,
              requestType
            )
          : endpoints.userRequest.getRange(normalizedFrom, normalizedTo, requestType);
        return apiClient.get<ApiEnvelope<unknown>>(path, {
          query: { page: String(page), size: String(size) },
        });
      });
  },

  parseRequestRows(res: ApiEnvelope<unknown>): Array<Record<string, unknown>> {
    return toPagedRows(res.data ?? res);
  },

  /** HR team review — merge employee-scoped and org-wide comp-off lists (same pattern as Leave). */
  async fetchHrTeamRequests(params: {
    fromDate: string;
    toDate: string;
    requestTypes: string[];
  }): Promise<Array<Record<string, unknown>>> {
    const { fromDate, toDate, requestTypes } = params;
    const collected: Array<Record<string, unknown>> = [];

    try {
      const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "500" });
      const onboardRows = toPagedRows((onboardRes as { data?: unknown }).data ?? onboardRes);
      const emailCsv = [
        ...new Set(
          onboardRows.map((row) => emailFromOnboardRow(row)).filter(Boolean)
        ),
      ].join(",");
      if (emailCsv) {
        collected.push(
          ...(await listRequestsByTypes({
            fromDate,
            toDate,
            requestTypes,
            empEmails: emailCsv,
          }))
        );
      }
    } catch {
      /* continue with range fetch */
    }

    collected.push(
      ...(await listRequestsByTypes({
        fromDate,
        toDate,
        requestTypes,
      }))
    );

    return dedupeCompOffRequestRows(collected);
  },

  createRequest(body: Record<string, unknown>) {
    return apiClient.post<ApiEnvelope<unknown>>(endpoints.userRequest.root, {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  updateRequest(body: Record<string, unknown>) {
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.userRequest.root, {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  deleteRequest(userRequestId: number) {
    return apiClient.delete<ApiEnvelope<unknown>>(endpoints.userRequest.root, {
      contentType: "application/json",
      body: JSON.stringify({ user_request_id: userRequestId }),
    });
  },

  /** PUT /api/v1/userRequest/status — approve or reject a comp-off request. */
  async updateRequestStatus(
    userRequestId: number,
    status: "APPROVED" | "REJECTED",
    message?: string | null
  ) {
    const idNum = Number(userRequestId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new Error("Invalid request id.");
    }
    const payload = {
      user_request_id: idNum,
      user_request_status: status,
      message: message ?? null,
    };
    try {
      return await apiClient.put<ApiEnvelope<unknown>>(endpoints.userRequest.status, {
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    } catch (firstError) {
      if (isAlreadyActedOnRequestError(firstError)) {
        return { message: "ok", data: null } as ApiEnvelope<unknown>;
      }
      try {
        return await apiClient.put<ApiEnvelope<unknown>>(endpoints.userRequest.status, {
          contentType: "application/json",
          body: JSON.stringify({
            user_request_id: idNum,
            user_request_status: status === "APPROVED" ? "APPROVE" : "REJECT",
            message: message ?? null,
          }),
        });
      } catch (secondError) {
        if (isAlreadyActedOnRequestError(secondError)) {
          return { message: "ok", data: null } as ApiEnvelope<unknown>;
        }
        throw firstError;
      }
    }
  },

  async updateEarnRequestStatus(
    userRequestId: number,
    status: "APPROVED" | "REJECTED",
    message?: string | null
  ) {
    const idNum = Number(userRequestId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new Error("Invalid request id.");
    }
    return apiClient.put<ApiEnvelope<unknown>>(endpoints.compOff.earnStatus, {
      contentType: "application/json",
      body: JSON.stringify({
        user_request_id: idNum,
        user_request_status: status,
        message: message ?? null,
      }),
    });
  },
};
