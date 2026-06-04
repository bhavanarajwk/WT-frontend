"use client";

import { MetricCard } from "@/components/dashboard/ui/MetricCard";
import { DataTable } from "@/components/dashboard/ui/DataTable";

type Props = {
  rows: Array<Record<string, unknown>>;
  peopleOnBench: number;
  loading?: boolean;
};

export function BenchAgingReportTable({ rows, peopleOnBench, loading = false }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-xl">
        <MetricCard label="People on bench" value={peopleOnBench} loading={loading} />
      </div>
      <DataTable
        title="Bench aging and size (includes investment allocations)"
        columns={["emp_id", "name", "department", "bench_days"]}
        rows={rows}
        emptyLabel="No bench aging rows."
        compact
      />
    </div>
  );
}
