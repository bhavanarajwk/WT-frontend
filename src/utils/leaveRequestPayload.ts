/** Build POST/PUT /userRequest body with snake_case + camelCase aliases. */

import { LEAVE_HR_CC_EMAILS } from "@/constants/leaveRequest";

export type LeaveRequestFormPayload = {
  request_from_date: string;
  request_to_date: string;
  request_type: string;
  comments: string;
  is_half_day?: boolean;
  client_approval?: boolean;
  reference_file_url?: string | null;
  primary_manager_emails?: string[];
  /** @deprecated Use primary_manager_emails */
  selected_manager_emails?: string[];
  additional_recipient_emails?: string[];
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
  const managerEmails =
    form.primary_manager_emails?.length
      ? form.primary_manager_emails
      : form.selected_manager_emails?.length
        ? form.selected_manager_emails
        : undefined;
  if (managerEmails?.length) {
    const normalizedManagers = [
      ...new Set(managerEmails.map((email) => email.trim()).filter(Boolean)),
    ];
    body.primary_manager_emails = normalizedManagers;
    body.primaryManagerEmails = normalizedManagers;
  }
  if (requestType === "LEAVE") {
    const hrCc = [...LEAVE_HR_CC_EMAILS];
    body.secondary_manager_emails = hrCc;
    body.secondaryManagerEmails = hrCc;
    body.secondary_managers = hrCc;
    body.secondaryManagers = hrCc;
  }
  if (form.additional_recipient_emails?.length) {
    body.additional_recipient_emails = form.additional_recipient_emails;
    body.additionalRecipientEmails = form.additional_recipient_emails;
  }
  if (options?.userRequestId != null) {
    body.user_request_id = options.userRequestId;
    body.userRequestId = options.userRequestId;
  }
  return body;
}
