"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { EmployeeLearningCatalog } from "@/components/learning-development/EmployeeLearningCatalog";
import { TrainingCard } from "@/components/learning-development/TrainingCard";
import { useHrTrainingsList } from "@/hooks/learning/useLearningTrainings";

function EmployeeLearningDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning &amp; Development</h1>
        <p className="text-sm text-wt-text-muted mt-1">
          Browse optional open trainings available to everyone. Enroll to access materials and marks.
        </p>
      </div>
      <EmployeeLearningCatalog />
    </div>
  );
}

function HrLearningDashboard() {
  const hrTrainingsQ = useHrTrainingsList();
  const trainings = hrTrainingsQ.data ?? [];
  const isLoading = hrTrainingsQ.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learning overview</h1>
          <p className="text-sm text-wt-text-muted mt-1">
            Open a training card to manage sessions, trainers, trainees, attendance, and scores.
          </p>
        </div>
        <Link
          href="/dashboard/learning-development/trainings?create=1"
          className="btn-primary px-4 py-2 text-sm"
        >
          New training
        </Link>
      </div>

      <article className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 max-w-xs">
        <p className="text-xs text-wt-text-muted">Total trainings</p>
        <p className="text-3xl font-semibold mt-1">{isLoading ? "…" : trainings.length}</p>
      </article>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Trainings</h2>
        {isLoading ? (
          <p className="text-sm text-wt-text-muted">Loading trainings…</p>
        ) : trainings.length === 0 ? (
          <p className="text-sm text-wt-text-muted">No trainings yet.</p>
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

export default function LearningDevelopmentDashboardPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  return hasHrAccess ? <HrLearningDashboard /> : <EmployeeLearningDashboard />;
}
