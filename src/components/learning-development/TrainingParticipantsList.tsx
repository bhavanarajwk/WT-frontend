"use client";

import { EnrollmentStatusBadge } from "@/components/learning-development/EnrollmentStatusBadge";
import { Button } from "@/components/ui/button";
import {
  participantRowDisplayLabel,
  participantRowUserId,
  traineeTableRowsFromParticipants,
} from "@/utils/learning/participants";

export function TrainingParticipantsList({
  rows,
  loading,
  canManage,
  updatingUserId,
  onMarkCompleted,
  onMarkWithdrawn,
  heading = "List of trainees",
}: {
  rows: Array<Record<string, unknown>>;
  loading?: boolean;
  canManage?: boolean;
  updatingUserId?: string | null;
  onMarkCompleted?: (userId: string) => void;
  onMarkWithdrawn?: (userId: string) => void;
  heading?: string;
}) {
  const participants = traineeTableRowsFromParticipants(rows);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-wt-text">{heading}</h3>
      {loading ? (
        <p className="text-sm text-wt-text-muted py-4 text-center">Loading trainees…</p>
      ) : !participants.length ? (
        <div className="rounded-xl border border-dashed border-wt-border bg-wt-surface-2/40 px-5 py-8 text-center">
          <p className="text-sm font-medium text-wt-text">No trainees enrolled</p>
          <p className="mt-1 text-xs text-wt-text-muted">Add a trainee using the form above.</p>
        </div>
      ) : (
    <ul className="divide-y divide-wt-border rounded-xl border border-wt-border overflow-hidden">
      {participants.map((participant) => {
        const rawStatus = participant.enrollmentStatus.trim();
        const status = (rawStatus === "—" || !rawStatus ? "ENROLLED" : rawStatus).toUpperCase();
        const isUpdating = updatingUserId === participant.userId;
        const canComplete = status !== "COMPLETED";
        const canWithdraw = status !== "WITHDRAWN";
        const showActions = canManage && (onMarkCompleted || onMarkWithdrawn);

        return (
          <li
            key={participant.key}
            className="flex items-center gap-3 bg-wt-surface-1 px-4 py-2.5 sm:px-5"
          >
            <div className="min-w-0 flex flex-1 items-center gap-2.5">
              <p className="truncate font-medium text-wt-text">{participant.name}</p>
              <EnrollmentStatusBadge status={status} />
            </div>

            {showActions ? (
              <div className="flex shrink-0 items-center gap-1.5">
                {canComplete && onMarkCompleted ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    disabled={isUpdating}
                    onClick={() => onMarkCompleted(participant.userId)}
                  >
                    {isUpdating ? "…" : "Complete"}
                  </Button>
                ) : null}
                {canWithdraw && onMarkWithdrawn ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    disabled={isUpdating}
                    onClick={() => onMarkWithdrawn(participant.userId)}
                  >
                    {isUpdating ? "…" : "Withdraw"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
      )}
    </div>
  );
}

/** Fallback label helper when only raw API rows are available. */
export function participantListLabel(row: Record<string, unknown>): string {
  const userId = participantRowUserId(row);
  return participantRowDisplayLabel(row, userId);
}
