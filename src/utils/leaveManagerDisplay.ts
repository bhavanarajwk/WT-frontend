import { pickRowField } from "@/utils/compOff";
import { requestFinalStatus } from "@/utils/userRequest";

export function pickManagerEmailList(row: Record<string, unknown>, kind: "primary" | "secondary"): string[] {
  const keys =
    kind === "primary"
      ? [
          "primary_managers",
          "primaryManagers",
          "primary_manager_emails",
          "primaryManagerEmails",
          "selected_manager_emails",
          "selectedManagerEmails",
        ]
      : ["secondary_managers", "secondaryManagers", "secondary_manager_emails", "secondaryManagerEmails"];

  const raw = pickRowField<unknown>(row, ...keys);
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => String(value ?? "").trim()).filter(Boolean);
}

export function formatManagerEmailList(emails: string[]): { display: string; title?: string } {
  const list = emails.map((email) => email.trim()).filter(Boolean);
  if (!list.length) return { display: "—" };
  if (list.length === 1) return { display: list[0] };
  return {
    display: `${list[0]} +${list.length - 1} more`,
    title: list.join("\n"),
  };
}

export function isLeaveRequestRow(row: Record<string, unknown>): boolean {
  return String(pickRowField(row, "request_type", "requestType") ?? "").trim().toUpperCase() === "LEAVE";
}

export function hasPrimaryLeaveManagers(row: Record<string, unknown>): boolean {
  return isLeaveRequestRow(row) && pickManagerEmailList(row, "primary").length > 0;
}

export function isOwnUserRequest(
  row: Record<string, unknown>,
  actorEmail: string | null | undefined
): boolean {
  const email = String(actorEmail ?? "").trim().toLowerCase();
  if (!email) return false;
  const empEmail = String(
    pickRowField(row, "emp_email", "empEmail", "email", "user_email", "userEmail") ?? ""
  )
    .trim()
    .toLowerCase();
  return Boolean(empEmail) && email === empEmail;
}

export function isAssignedPrimaryLeaveManager(
  row: Record<string, unknown>,
  actorEmail: string | null | undefined
): boolean {
  const email = String(actorEmail ?? "").trim().toLowerCase();
  if (!email || !isLeaveRequestRow(row)) return false;
  return pickManagerEmailList(row, "primary").some(
    (managerEmail) => managerEmail.trim().toLowerCase() === email
  );
}

/** Primary-manager leave workflow: assigned approver who is not the request owner and request is pending. */
export function canPrimaryManagerActOnLeave(
  row: Record<string, unknown>,
  actorEmail: string | null | undefined
): boolean {
  if (!isAssignedPrimaryLeaveManager(row, actorEmail)) return false;
  if (isOwnUserRequest(row, actorEmail)) return false;
  return requestFinalStatus(row) === "PENDING";
}
