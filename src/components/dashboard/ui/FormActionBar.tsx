import type { ReactNode } from "react";
import { UI_COPY } from "@/constants/uiCopy";

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
  "inline-flex min-h-10 min-w-[8.5rem] items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium";

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
      className={[
        "rounded-xl border border-wt-border bg-wt-surface-1 px-5 py-4 md:px-6",
        sticky
          ? "sticky bottom-4 z-10 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm supports-[backdrop-filter]:bg-wt-surface-1/95"
          : "shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {children}
          {hint ? <p className="text-sm text-wt-text-muted">{hint}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            className={`btn-ghost ${actionButtonClass} w-full sm:w-auto`}
            disabled={isDisabled}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn-primary ${actionButtonClass} w-full sm:w-auto`}
            disabled={isDisabled}
            onClick={onSave}
          >
            {saving ? savingLabel : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
