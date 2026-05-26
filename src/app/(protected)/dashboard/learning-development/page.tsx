"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { TrainingCard } from "@/components/learning-development/TrainingCard";
import {
  useMyTrainingEnrollments,
  useTrainingsList,
} from "@/hooks/learning/useLearningTrainings";

export default function LearningDevelopmentDashboardPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const hrTrainingsQ = useTrainingsList(hasHrAccess);
  const myEnrollmentsQ = useMyTrainingEnrollments(undefined, !hasHrAccess);

  const trainings = hasHrAccess ? (hrTrainingsQ.data ?? []) : (myEnrollmentsQ.data ?? []);
  const isLoading = hasHrAccess ? hrTrainingsQ.isLoading : myEnrollmentsQ.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learning overview</h1>
          <p className="text-sm text-wt-text-muted mt-1">
            {hasHrAccess
              ? "Open a training card to manage sessions, trainers, trainees, attendance, and scores."
              : "Trainings you are enrolled in. Open a card to view materials and published marks."}
          </p>
        </div>
        <Link href="/dashboard/learning-development/trainings" className="btn-primary px-4 py-2 text-sm">
          New training
        </Link>
      </div>

      <article className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 max-w-xs">
        <p className="text-xs text-wt-text-muted">Total trainings</p>
        <p className="text-3xl font-semibold mt-1">{isLoading ? "…" : trainings.length}</p>
      </article>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{hasHrAccess ? "Trainings" : "My trainings"}</h2>
        {isLoading ? (
          <p className="text-sm text-wt-text-muted">Loading trainings…</p>
        ) : trainings.length === 0 ? (
          <p className="text-sm text-wt-text-muted">
            {hasHrAccess
              ? "No trainings yet."
              : "You are not enrolled in any trainings yet."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {trainings.map((row) => {
              const id = String(row.id ?? "").trim();
              return (
                <TrainingCard
                  key={id || String(row.name)}
                  row={row}
                  href={`/dashboard/learning-development/trainings/${encodeURIComponent(id)}`}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
