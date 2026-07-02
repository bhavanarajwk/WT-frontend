export type UserRequestType = "LEAVE" | "WFH" | "COMP_OFF" | "COMP_OFF_EARN";

export function normalizeUserRequestType(value: unknown): UserRequestType {
  const raw = String(value ?? "LEAVE")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (raw === "WFH" || raw === "WORK_FROM_HOME") return "WFH";
  if (raw === "COMP_OFF_EARN" || raw === "COMPOFF_EARN") return "COMP_OFF_EARN";
  if (raw === "COMP_OFF" || raw === "COMPOFF") return "COMP_OFF";
  return "LEAVE";
}

export function userRequestTypePhrase(type: unknown): string {
  const normalized = normalizeUserRequestType(type);
  if (normalized === "WFH") return "work-from-home";
  if (normalized === "COMP_OFF_EARN") return "comp-off earn";
  if (normalized === "COMP_OFF") return "comp-off";
  return "leave";
}

/** User-facing label for tables, filters, and selects (API values unchanged). */
export function formatUserRequestTypeLabel(type: unknown): string {
  const raw = String(type ?? "").trim();
  if (!raw) return "—";
  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if (upper === "ALL") return "All types";
  if (upper === "WFH" || upper === "WORK_FROM_HOME") return "Work from home";
  if (upper === "COMP_OFF" || upper === "COMPOFF") return "Comp off";
  if (upper === "COMP_OFF_EARN" || upper === "COMPOFF_EARN") return "Comp off (earn)";
  if (upper === "LEAVE") return "Leave";
  return raw
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const USER_REQUEST_TYPE_SELECT_OPTIONS = [
  { value: "LEAVE", label: "Leave" },
  { value: "WFH", label: "Work from home" },
] as const;

export const USER_REQUEST_FILTER_TYPE_OPTIONS = [
  { value: "ALL", label: "All types" },
  { value: "LEAVE", label: "Leave" },
  { value: "WFH", label: "Work from home" },
  { value: "COMP_OFF", label: "Comp off (usage)" },
] as const;

export function userRequestActionLabel(
  type: unknown,
  action: "submit" | "update" | "revoke" | "approve" | "reject"
): string {
  const phrase = userRequestTypePhrase(type);
  switch (action) {
    case "submit":
      return `Submit ${phrase} request`;
    case "update":
      return `Update ${phrase} request`;
    case "revoke":
      return `Revoke ${phrase} request`;
    case "approve":
      return `Approve ${phrase} request`;
    case "reject":
      return `Reject ${phrase} request`;
  }
}

function titleCasePhrase(phrase: string): string {
  const trimmed = phrase.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function formatActionSuccessMessage(label: string): string {
  const l = label.trim();

  const submitReq = /^Submit (.+) request$/i.exec(l);
  if (submitReq) {
    const phrase = submitReq[1].trim().toLowerCase();
    if (phrase === "leave") return "Leave request submitted successfully.";
    return `${titleCasePhrase(submitReq[1])} request submitted.`;
  }

  const updateReq = /^Update (.+) request$/i.exec(l);
  if (updateReq) return `${titleCasePhrase(updateReq[1])} request updated.`;

  const revokeReq = /^Revoke (.+) request$/i.exec(l);
  if (revokeReq) return `${titleCasePhrase(revokeReq[1])} request revoked.`;

  const approveReq = /^Approve (.+) request$/i.exec(l);
  if (approveReq) return `${titleCasePhrase(approveReq[1])} request approved.`;

  const rejectReq = /^Reject (.+) request$/i.exec(l);
  if (rejectReq) return `${titleCasePhrase(rejectReq[1])} request rejected.`;

  if (/^load /i.test(l)) {
    const rest = l.replace(/^load /i, "").trim();
    return `${titleCasePhrase(rest)} loaded.`;
  }
  if (/^refresh /i.test(l)) {
    const rest = l.replace(/^refresh /i, "").trim();
    return `${titleCasePhrase(rest)} refreshed.`;
  }
  if (/^create and invite employee$/i.test(l)) {
    return "Employee created successfully. An invitation has been sent.";
  }
  if (/^create /i.test(l)) {
    const rest = l.replace(/^create /i, "").trim();
    return `${titleCasePhrase(rest)} created.`;
  }
  if (/^update /i.test(l)) {
    const rest = l.replace(/^update /i, "").trim();
    return `${titleCasePhrase(rest)} updated.`;
  }
  if (/^delete /i.test(l)) {
    const rest = l.replace(/^delete /i, "").trim();
    return `${titleCasePhrase(rest)} deleted.`;
  }
  if (/^submit /i.test(l)) {
    const rest = l.replace(/^submit /i, "").trim();
    return `${titleCasePhrase(rest)} submitted.`;
  }
  if (/^save /i.test(l)) {
    const rest = l.replace(/^save /i, "").trim();
    return `${titleCasePhrase(rest)} saved.`;
  }
  if (/^publish scores$/i.test(l)) {
    return "Scores published. Employees will be notified by email.";
  }
  if (/^upload /i.test(l)) {
    const rest = l.replace(/^upload /i, "").trim();
    return `${titleCasePhrase(rest)} uploaded.`;
  }
  if (/^assign trainer$/i.test(l)) {
    return "Trainer assigned.";
  }
  if (/^remove trainer$/i.test(l)) {
    return "Trainer removed.";
  }
  if (/^assign /i.test(l)) {
    const rest = l.replace(/^assign /i, "").trim();
    return `${titleCasePhrase(rest)} assigned.`;
  }
  if (/^reset /i.test(l)) {
    const rest = l.replace(/^reset /i, "").trim();
    return `${titleCasePhrase(rest)} reset.`;
  }
  if (/^mark /i.test(l)) {
    const rest = l.replace(/^mark /i, "").trim();
    return `${titleCasePhrase(rest)} marked.`;
  }

  return `${l} completed.`;
}

export function formatActionErrorMessage(label: string, backendMessage?: string): string {
  if (backendMessage?.trim()) {
    const message = backendMessage.trim();
    if (message.startsWith("[") && message.includes("value_error")) {
      return "Please check the form fields and try again.";
    }
    return message;
  }

  const l = label.trim();

  const submitReq = /^Submit (.+) request$/i.exec(l);
  if (submitReq) {
    return `Unable to submit ${submitReq[1]} request. Please try again.`;
  }

  const updateReq = /^Update (.+) request$/i.exec(l);
  if (updateReq) {
    return `Unable to update ${updateReq[1]} request. Please try again.`;
  }

  const revokeReq = /^Revoke (.+) request$/i.exec(l);
  if (revokeReq) {
    return `Unable to revoke ${revokeReq[1]} request. Please try again.`;
  }

  const approveReq = /^Approve (.+) request$/i.exec(l);
  if (approveReq) {
    return `Unable to approve ${approveReq[1]} request. Please try again.`;
  }

  const rejectReq = /^Reject (.+) request$/i.exec(l);
  if (rejectReq) {
    return `Unable to reject ${rejectReq[1]} request. Please try again.`;
  }

  return `Unable to ${l.toLowerCase()}. Please try again.`;
}
