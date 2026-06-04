"use client";

import { InputField } from "@/components/dashboard/ui/forms";

type UserRequestRejectDialogProps = {
  open: boolean;
  title: string;
  description: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  confirmLabel: string;
  confirmingLabel: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  loading?: boolean;
};

export function UserRequestRejectDialog({
  open,
  title,
  description,
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter reason",
  confirmLabel,
  confirmingLabel,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  confirmDisabled,
  loading,
}: UserRequestRejectDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-request-reject-title"
        className="w-full max-w-md rounded-2xl border border-wt-border bg-wt-surface-1 p-5 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="user-request-reject-title" className="text-base font-semibold text-wt-text">
          {title}
        </h2>
        <p className="text-sm text-wt-text-muted">{description}</p>
        <InputField
          label={reasonLabel}
          value={reason}
          onChange={onReasonChange}
          placeholder={reasonPlaceholder}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm border border-wt-border hover:bg-wt-surface-2 disabled:opacity-50"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm border border-rose-600/30 text-rose-700 hover:bg-rose-500/10 disabled:opacity-50"
            onClick={onConfirm}
            disabled={confirmDisabled || loading || !reason.trim()}
          >
            {loading ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
