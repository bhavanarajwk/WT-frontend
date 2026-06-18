"use client";

import { WtLoader, WtLoaderCentered } from "@/components/dashboard/ui/WtLoader";

/** Inline black loader for section/table loading states. */
export function SectionLoading({
  label,
  className = "py-8",
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`.trim()} role="status" aria-live="polite">
        <WtLoader size="sm" label={label ?? "Loading"} />
        {label ? <span className="text-sm text-wt-text-muted">{label}</span> : null}
      </div>
    );
  }

  return <WtLoaderCentered label={label} className={className} />;
}
