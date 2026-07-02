import { Skeleton } from "@/components/ui/skeleton";
import { formatUILabel } from "@/utils/titleCase";

export function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <article className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 shadow-sm transition-colors hover:border-wt-border-md">
      <p className="text-xs font-medium uppercase tracking-wide text-wt-text-muted">
        {formatUILabel(label)}
      </p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tracking-tight text-wt-text tabular-nums">
          {value.toLocaleString()}
        </p>
      )}
    </article>
  );
}
