import { extractFirstObjectArray, toPagedRows } from "@/utils/apiRows";
import { cleanEmployeeName } from "@/utils/employeeDirectory";

function rowLooksLikeTrainingTrainer(row: Record<string, unknown>): boolean {
  return (
    row.trainer_user_id != null ||
    row.trainerUserId != null ||
    row.trainer_id != null ||
    row.trainerId != null ||
    row.trainer != null ||
    row.trainerDto != null ||
    row.trainer_dto != null ||
    (row.user_id != null && (row.name != null || row.trainer_name != null)) ||
    Boolean(row.user && typeof row.user === "object")
  );
}

/** Unwrap GET /api/v1/trainings/:id/trainers payloads that may nest arrays under custom keys. */
export function trainerListFromApiEnvelope(res: unknown): Array<Record<string, unknown>> {
  const rows = toPagedRows((res as { data?: unknown })?.data ?? res);
  if (rows.length) return rows;

  let payload: unknown = (res as { data?: unknown })?.data ?? res;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
      const fromString = trainerListFromApiEnvelope({ data: payload });
      if (fromString.length) return fromString;
    } catch {
      return [];
    }
  }

  if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    for (const key of [
      "trainers",
      "training_trainers",
      "trainingTrainers",
      "trainerList",
      "trainer_list",
      "assigned_trainers",
      "assignedTrainers",
      "records",
      "elements",
      "values",
      "items",
      "result",
      "body",
    ] as const) {
      const arr = o[key];
      if (Array.isArray(arr) && arr.length) return arr as Array<Record<string, unknown>>;
    }

    const embedded = o._embedded;
    if (embedded && typeof embedded === "object" && !Array.isArray(embedded)) {
      for (const v of Object.values(embedded as Record<string, unknown>)) {
        if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
          return v as Array<Record<string, unknown>>;
        }
      }
    }

    const extracted = extractFirstObjectArray(payload);
    if (extracted.length && extracted.some(rowLooksLikeTrainingTrainer)) return extracted;
  }

  if (Array.isArray(res)) return res as Array<Record<string, unknown>>;
  return [];
}

function trainerRowName(record: Record<string, unknown>): string {
  const nested =
    (record.user as Record<string, unknown> | undefined) ??
    (record.trainer as Record<string, unknown> | undefined) ??
    (record.employee as Record<string, unknown> | undefined);
  const raw = String(
    record.name ??
      record.employee_name ??
      record.employeeName ??
      record.trainer_name ??
      record.trainerName ??
      record.full_name ??
      record.fullName ??
      nested?.name ??
      nested?.employee_name ??
      nested?.full_name ??
      ""
  ).trim();
  return cleanEmployeeName({ name: raw || "Trainer" });
}

function trainerRowUserId(record: Record<string, unknown>): string {
  const nested =
    (record.user as Record<string, unknown> | undefined) ??
    (record.trainer as Record<string, unknown> | undefined);
  return String(
    record.trainer_user_id ??
      record.trainerUserId ??
      record.user_id ??
      record.userId ??
      nested?.user_id ??
      nested?.userId ??
      nested?.id ??
      ""
  ).trim();
}

export function normalizeTrainingTrainerRows(
  input: unknown
): Array<Record<string, unknown>> {
  const fromEnvelope = trainerListFromApiEnvelope(input);
  const rows = Array.isArray(input) ? input : fromEnvelope.length ? fromEnvelope : toPagedRows(input);

  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      const inner =
        (record.trainer as Record<string, unknown> | undefined) ??
        (record.trainerDto as Record<string, unknown> | undefined) ??
        (record.trainer_dto as Record<string, unknown> | undefined);
      const merged =
        inner && typeof inner === "object"
          ? { ...record, ...inner, user: record.user ?? inner.user }
          : record;

      const trainerUserId = trainerRowUserId(merged);
      if (!trainerUserId) return null;

      const name = trainerRowName(merged);
      const email = String(
        merged.email ??
          merged.trainer_email ??
          merged.trainerEmail ??
          merged.user_email ??
          merged.userEmail ??
          (merged.user as Record<string, unknown> | undefined)?.email ??
          ""
      ).trim();

      return {
        ...merged,
        trainer_user_id: trainerUserId,
        user_id: trainerUserId,
        name: name || (trainerUserId ? `User #${trainerUserId}` : "—"),
        email: email || "—",
      };
    })
    .filter((row): row is Record<string, unknown> => Boolean(row));
}
