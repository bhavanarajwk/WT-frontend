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
    <article className="rounded-2xl border border-wt-border bg-wt-surface-1 p-4">
      <p className="text-xs text-wt-text-muted">{label}</p>
      <p className="text-2xl mt-1 font-semibold">{loading ? "..." : value}</p>
    </article>
  );
}
