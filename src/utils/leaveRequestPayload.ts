/** Build POST/PUT /userRequest body with snake_case + camelCase aliases. */

export type LeaveRequestFormPayload = {
  request_from_date: string;
  request_to_date: string;
  request_type: string;
  comments: string;
  is_half_day?: boolean;
  client_approval?: boolean;
  reference_file_url?: string | null;
  selected_manager_emails?: string[];
};

export function buildUserRequestBody(
  form: LeaveRequestFormPayload,
  options?: { userRequestId?: number }
): Record<string, unknown> {
  const requestType = String(form.request_type ?? "LEAVE").trim().toUpperCase();
  const fromDate = form.request_from_date.trim();
  const toDate = form.request_to_date.trim();
  const comments = form.comments.trim();
  const isHalfDay = Boolean(form.is_half_day);
  const body: Record<string, unknown> = {
    request_from_date: fromDate,
    request_to_date: toDate,
    requestFromDate: fromDate,
    requestToDate: toDate,
    request_type: requestType,
    requestType,
    comments,
    is_half_day: isHalfDay,
    isHalfDay,
    reference_file_url: form.reference_file_url ?? null,
    referenceFileUrl: form.reference_file_url ?? null,
  };
  if (form.client_approval !== undefined) {
    body.client_approval = form.client_approval;
    body.clientApproval = form.client_approval;
  }
  if (form.selected_manager_emails?.length) {
    body.selected_manager_emails = form.selected_manager_emails;
    body.selectedManagerEmails = form.selected_manager_emails;
  }
  if (options?.userRequestId != null) {
    body.user_request_id = options.userRequestId;
    body.userRequestId = options.userRequestId;
  }
  return body;
}
