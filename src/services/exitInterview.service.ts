import { endpoints } from "@/api/endpoints";
import { apiClient, type ApiEnvelope } from "@/api/httpClient";
import type {
  ExitInterviewFormDefinition,
  ExitInterviewMinutesOfMeetingUpdate,
  ExitInterviewSubmissionDetail,
  ExitInterviewSubmissionsListData,
  ExitInterviewSubmissionsQuery,
  ExitInterviewSubmitBody,
  ExitInterviewSubmitResult,
} from "@/types/exit-interview";

function submissionsQuery(params: ExitInterviewSubmissionsQuery): Record<string, string> {
  const query: Record<string, string> = {
    page: String(params.page ?? 0),
    size: String(params.size ?? 10),
    status: params.status ?? "SUBMITTED",
  };
  const search = params.search?.trim();
  if (search) query.search = search;
  return query;
}

export const exitInterviewService = {
  getFormDefinition() {
    return apiClient.get<ApiEnvelope<ExitInterviewFormDefinition>>(
      endpoints.exitInterview.formDefinition
    );
  },

  submit(body: ExitInterviewSubmitBody) {
    return apiClient.post<ApiEnvelope<ExitInterviewSubmitResult>>(endpoints.exitInterview.submit, {
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  },

  listSubmissions(params: ExitInterviewSubmissionsQuery = {}) {
    return apiClient.get<ApiEnvelope<ExitInterviewSubmissionsListData>>(
      endpoints.exitInterview.submissions,
      { query: submissionsQuery(params) }
    );
  },

  getSubmission(empId: string) {
    return apiClient.get<ApiEnvelope<ExitInterviewSubmissionDetail>>(
      endpoints.exitInterview.submissionByEmpId(empId)
    );
  },

  updateMinutesOfMeeting(empId: string, body: ExitInterviewMinutesOfMeetingUpdate) {
    return apiClient.put<ApiEnvelope<ExitInterviewSubmissionDetail>>(
      endpoints.exitInterview.minutesOfMeetingByEmpId(empId),
      {
        contentType: "application/json",
        body: JSON.stringify(body),
      }
    );
  },
};
