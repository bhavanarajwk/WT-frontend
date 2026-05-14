"use client";

import { useMemo, useState } from "react";
import { useTrainingAnalytics } from "@/components/learning-development/hooks/useLearningTrainings";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";

export function AnalyticsPageClient() {
  const [trainingId, setTrainingId] = useState("");
  const analyticsQ = useTrainingAnalytics(trainingId, Boolean(trainingId.trim()));

  const entries = useMemo(() => {
    const a = analyticsQ.data ?? {};
    return Object.entries(a);
  }, [analyticsQ.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-wt-text-muted mt-1">Training-level insights returned by the analytics API.</p>
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {analyticsQ.isLoading ? (
          <p className="text-sm text-wt-text-muted">Loading analytics…</p>
        ) : entries.length ? (
          entries.map(([key, value]) => (
            <article key={key} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">{key.replaceAll("_", " ")}</p>
              <p className="text-lg font-semibold mt-2 break-all">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm text-wt-text-muted">Select a training with analytics data.</p>
        )}
      </div>
    </div>
  );
}
