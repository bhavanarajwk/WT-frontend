import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import { emailFromOnboardRow } from "@/utils/learning/onboardOptions";

export type AllocationUserOption = { name: string; email: string; role?: string };

const ALLOCATION_DIRECTORY_PAGE_SIZE = "1000";

/** Full onboard directory for allocation pickers — no status or role filters. */
export async function fetchAllocationUserDirectory(): Promise<{
  rows: Array<Record<string, unknown>>;
  users: AllocationUserOption[];
}> {
  const res = await hrmsService.getOnboardList({
    page: "0",
    size: ALLOCATION_DIRECTORY_PAGE_SIZE,
  });
  const rows = toPagedRows((res as { data?: unknown }).data ?? res);
  return { rows, users: onboardRowsToAllocationUsers(rows) };
}

export function onboardRowsToAllocationUsers(
  rows: Array<Record<string, unknown>>
): AllocationUserOption[] {
  return Array.from(
    new Map(
      rows
        .map((row) => {
          const email = emailFromOnboardRow(row) || String(row.email ?? "").trim();
          const name = String(row.name ?? email).trim();
          const role = String(
            row.role ?? row.designation ?? row.designation_name ?? row.designationName ?? ""
          ).trim();
          if (!email) return null;
          return [email.toLowerCase(), { name, email, ...(role ? { role } : {}) }] as const;
        })
        .filter(
          (x): x is readonly [string, AllocationUserOption] => Boolean(x)
        )
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
}
