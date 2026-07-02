import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-wt-border bg-wt-surface-2/50 px-6 py-14 text-center",
        className
      )}
      role="status"
    >
      {icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-wt-surface-3 text-wt-text-muted">
          {icon}
        </div>
      ) : (
        <div
          className="mb-4 flex size-11 items-center justify-center rounded-full bg-wt-surface-3 text-lg text-wt-text-faint"
          aria-hidden
        >
          ∅
        </div>
      )}
      <p className="text-sm font-semibold text-wt-text">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-wt-text-muted">{description}</p>
      ) : null}
    </div>
  );
}
