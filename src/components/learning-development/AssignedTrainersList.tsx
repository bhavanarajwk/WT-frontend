"use client";

import { IconTrash } from "@/components/dashboard/ui/icons";
import { cleanEmployeeName } from "@/utils/employeeDirectory";

function trainerRowUserId(row: Record<string, unknown>): string {
  return String(
    row.trainer_user_id ?? row.trainerUserId ?? row.user_id ?? row.userId ?? ""
  ).trim();
}

function trainerRowName(row: Record<string, unknown>): string {
  return cleanEmployeeName({
    name: String(row.name ?? row.employee_name ?? row.trainer_name ?? "Trainer").trim() || "Trainer",
  });
}

export function AssignedTrainersList({
  rows,
  loading,
  canManage,
  removingUserId,
  onRemove,
  heading = "List of trainers",
}: {
  rows: Array<Record<string, unknown>>;
  loading?: boolean;
  canManage?: boolean;
  removingUserId?: string | null;
  onRemove?: (trainerUserId: string) => void;
  heading?: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-wt-text">{heading}</h3>
      {loading ? (
        <p className="text-sm text-wt-text-muted py-4 text-center">Loading trainers…</p>
      ) : !rows.length ? (
        <div className="rounded-xl border border-dashed border-wt-border bg-wt-surface-2/40 px-5 py-8 text-center">
          <p className="text-sm font-medium text-wt-text">No trainers assigned</p>
          <p className="mt-1 text-xs text-wt-text-muted">Assign a trainer using the form above.</p>
        </div>
      ) : (
    <ul className="divide-y divide-wt-border rounded-xl border border-wt-border overflow-hidden">
      {rows.map((row) => {
        const userId = trainerRowUserId(row);
        const name = trainerRowName(row);
        const key = userId || name;
        const isRemoving = Boolean(userId && removingUserId === userId);

        return (
          <li
            key={key}
            className="flex items-center gap-3 bg-wt-surface-1 px-4 py-2.5 sm:px-5"
          >
            <p className="min-w-0 flex-1 truncate font-medium text-wt-text">{name}</p>
            {canManage && userId && onRemove ? (
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-wt-text-muted transition hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                disabled={isRemoving}
                onClick={() => onRemove(userId)}
                aria-label={isRemoving ? `Removing ${name}` : `Remove ${name}`}
                title={isRemoving ? "Removing…" : "Remove trainer"}
              >
                <IconTrash />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
      )}
    </div>
  );
}
