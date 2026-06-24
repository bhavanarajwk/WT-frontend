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
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-wt-border bg-wt-surface-2/40 px-6 py-12 text-center",
        className
      )}
      role="status"
    >
      {icon ? <div className="mb-3 text-wt-text-muted">{icon}</div> : null}
      <p className="text-sm font-medium text-wt-text">{title}</p>
      {description ? <p className="mt-1 text-sm text-wt-text-muted">{description}</p> : null}
    </div>
  );
}
