import { hrmsService } from "@/services/hrms.service";
import { buildEmailToNameMap } from "@/utils/dashboard/allocationDisplay";
import { fetchAllocationUserDirectory } from "@/utils/allocation/allocationUserDirectory";
import { pickRowField } from "@/utils/compOff";
import { requestRowEmail } from "@/utils/learning/onboardOptions";

function nameFromUserPayload(payload: Record<string, unknown> | null | undefined): string {
  if (!payload || typeof payload !== "object") return "";
  const nested =
    (payload.user as Record<string, unknown> | undefined)?.name ??
    (payload.profile as Record<string, unknown> | undefined)?.name;
  return String(payload.name ?? nested ?? "").trim();
}

/** Resolve display names for comp-off rows: onboard directory, then GET /user?email=. */
export async function resolveEmployeeNamesByEmail(emails: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return {};

  let emailToName: Record<string, string> = {};
  try {
    const { rows } = await fetchAllocationUserDirectory();
    emailToName = buildEmailToNameMap(rows);
  } catch {
    emailToName = {};
  }

  const unresolved = unique.filter((email) => !emailToName[email]);
  await Promise.all(
    unresolved.map(async (email) => {
      try {
        const userRes = await hrmsService.getUser({ email });
        const payload = ((userRes as { data?: unknown }).data ?? userRes) as
          | Record<string, unknown>
          | null;
        const name = nameFromUserPayload(payload);
        if (name) emailToName[email] = name;
      } catch {
        /* lookup miss */
      }
    })
  );

  return emailToName;
}

export function compOffEmployeeDisplayName(
  row: Record<string, unknown>,
  emailToName: Record<string, string>
): string {
  const email = requestRowEmail(row);
  if (email && emailToName[email]) return emailToName[email];

  const fromRow = String(
    pickRowField(row, "employee_display", "name", "employee_name", "emp_name", "empName") ?? ""
  ).trim();
  if (fromRow) return fromRow;

  if (email) return email;
  return "—";
}
