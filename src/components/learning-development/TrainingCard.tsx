"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/learning-development/ui/forms";
import { formatApiDateDisplay } from "@/utils/apiDate";

function formatLabel(value: unknown): string {
  return String(value ?? "—")
    .trim()
    .replaceAll("_", " ");
}

export function TrainingCard({
  row,
  href,
  showEdit,
  onEdit,
}: {
  row: Record<string, unknown>;
  href: string;
  showEdit?: boolean;
  onEdit?: () => void;
}) {
  const id = String(row.id ?? "").trim();
  const name = String(row.name ?? `Training ${id}`).trim();
  const description = String(row.description ?? "").trim();
  const category = formatLabel(row.category);
  const type = formatLabel(row.type);
  const status = String(row.status ?? "—");
  const start = formatApiDateDisplay(String(row.start_date ?? row.training_start ?? ""));
  const end = formatApiDateDisplay(String(row.end_date ?? row.training_end ?? ""));

  return (
    <article className="group relative flex min-h-[168px] flex-col rounded-xl border border-wt-border bg-wt-surface-1 p-5 transition hover:border-indigo-500/40 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        aria-label={`Open ${name}`}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col pointer-events-none">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-base leading-snug line-clamp-2 pr-2 group-hover:text-indigo-700 transition-colors">
            {name}
          </h3>
          <StatusBadge status={status} />
        </div>
        <p className="mt-2 text-sm text-wt-text-muted line-clamp-2 flex-1">
          {description || "No description yet."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-wt-text-muted">
          <span className="rounded-md border border-wt-border bg-wt-surface-2 px-2 py-0.5">{category}</span>
          <span className="rounded-md border border-wt-border bg-wt-surface-2 px-2 py-0.5">{type}</span>
        </div>
        <p className="mt-3 text-xs text-wt-text-faint">
          {start} → {end}
        </p>
      </div>
      {showEdit && onEdit ? (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="relative z-20 mt-3 h-auto self-start p-0 pointer-events-auto text-indigo-600"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
        >
          Edit training
        </Button>
      ) : null}
    </article>
  );
}
