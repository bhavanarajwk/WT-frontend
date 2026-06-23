"use client";

import { InputField } from "@/components/dashboard/ui/forms";
import { Button } from "@/components/ui/button";

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
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={onConfirm}
            disabled={confirmDisabled || loading || !reason.trim()}
          >
            {loading ? confirmingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
