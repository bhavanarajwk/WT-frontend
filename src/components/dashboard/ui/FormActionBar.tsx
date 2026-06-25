import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { UI_COPY } from "@/constants/uiCopy";
import { cn } from "@/lib/utils";

type FormActionBarProps = {
  onCancel: () => void;
  onSave: () => void;
  cancelLabel?: string;
  saveLabel?: string;
  savingLabel?: string;
  saving?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  /** Pin to the bottom of the scroll area while editing long forms. */
  sticky?: boolean;
  className?: string;
  children?: ReactNode;
};

const actionButtonClass =
  "min-h-10 min-w-[8.5rem] px-5 py-2.5 w-full sm:w-auto";

export function FormActionBar({
  onCancel,
  onSave,
  cancelLabel = UI_COPY.cancel,
  saveLabel = UI_COPY.saveChanges,
  savingLabel = UI_COPY.saving,
  saving = false,
  disabled = false,
  hint,
  sticky = true,
  className = "",
  children,
}: FormActionBarProps) {
  const isDisabled = disabled || saving;

  return (
    <div
      className={cn(
        "rounded-xl border border-wt-border bg-wt-surface-1 px-5 py-4 md:px-6",
        sticky
          ? "sticky bottom-4 z-10 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm supports-[backdrop-filter]:bg-wt-surface-1/95"
          : "shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {children}
          {hint ? <p className="text-sm text-wt-text-muted">{hint}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className={actionButtonClass}
            disabled={isDisabled}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="brand"
            className={actionButtonClass}
            disabled={isDisabled}
            onClick={onSave}
          >
            {saving ? savingLabel : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
