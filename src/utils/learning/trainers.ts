import { toPagedRows } from "@/utils/apiRows";

export function normalizeTrainingTrainerRows(
  input: unknown
): Array<Record<string, unknown>> {
  const rows = Array.isArray(input) ? input : toPagedRows(input);
  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    const trainerUserId = String(
      record.trainer_user_id ?? record.trainerUserId ?? record.user_id ?? record.userId ?? ""
    ).trim();
    const name = String(record.name ?? record.trainer_name ?? record.trainerName ?? "").trim();
    const email = String(record.email ?? record.trainer_email ?? record.trainerEmail ?? "").trim();
    return {
      ...record,
      trainer_user_id: trainerUserId,
      user_id: trainerUserId,
      name: name || (trainerUserId ? `User #${trainerUserId}` : "—"),
      email: email || "—",
    };
  });
}
