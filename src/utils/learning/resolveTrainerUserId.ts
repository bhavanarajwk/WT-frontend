import { hrmsService } from "@/services/hrms.service";

function lookupPayload(
  response: unknown
): Record<string, unknown> | null {
  return ((response as { data?: unknown }).data ?? response) as Record<string, unknown> | null;
}

function numericUserIdFromLookupPayload(payload: Record<string, unknown> | null): number {
  const nestedUser = (payload?.user as Record<string, unknown> | undefined) ?? null;
  const candidate = Number(
    payload?.id ??
      payload?.user_id ??
      payload?.userId ??
      nestedUser?.id ??
      nestedUser?.user_id ??
      nestedUser?.userId ??
      0
  );
  return Number.isFinite(candidate) && candidate > 0 ? candidate : 0;
}

async function lookupUserIdByEmail(email: string): Promise<number> {
  const userRes = await hrmsService.getUser({ email });
  const payload = lookupPayload(userRes);
  const idNum = numericUserIdFromLookupPayload(payload);
  if (idNum > 0) return idNum;

  const empId = String(payload?.emp_id ?? payload?.empId ?? "").trim();
  if (!empId) return 0;

  const byEmpRes = await hrmsService.getUser({ empId });
  return numericUserIdFromLookupPayload(lookupPayload(byEmpRes));
}

async function lookupUserIdByEmpId(empId: string): Promise<number> {
  const userRes = await hrmsService.getUser({ empId });
  return numericUserIdFromLookupPayload(lookupPayload(userRes));
}

/** Resolve dropdown value (numeric id, `email:foo`, or legacy emp id) to a numeric user id for APIs. */
export async function resolveLearningTrainerUserId(selectedValue: string): Promise<number> {
  const trimmed = selectedValue.trim();
  if (!trimmed) {
    throw new Error("Please select a valid user.");
  }

  const directId = Number(trimmed);
  if (Number.isFinite(directId) && directId > 0) {
    return directId;
  }

  if (trimmed.startsWith("email:")) {
    const email = trimmed.slice("email:".length).trim();
    if (!email) {
      throw new Error("Please select a valid user.");
    }
    const idNum = await lookupUserIdByEmail(email);
    if (idNum > 0) return idNum;
    throw new Error("Please select a valid user.");
  }

  const idNum = await lookupUserIdByEmpId(trimmed);
  if (idNum > 0) return idNum;

  throw new Error("Please select a valid user.");
}
