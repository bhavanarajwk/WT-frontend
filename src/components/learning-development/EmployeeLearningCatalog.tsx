"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { TrainingCard } from "@/components/learning-development/TrainingCard";
import { useOpenTrainingsList } from "@/hooks/learning/useLearningTrainings";
import { hrmsService } from "@/services/hrms.service";

const ENROLLED_STORAGE_KEY = "wt-learning-enrolled-ids";

function loadEnrolledIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(ENROLLED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => String(id).trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function saveEnrolledIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ENROLLED_STORAGE_KEY, JSON.stringify([...ids]));
}

function trainingDetailHref(trainingId: string) {
  return `/dashboard/learning-development/trainings/${encodeURIComponent(trainingId)}`;
}

export function EmployeeLearningCatalog() {
  const qc = useQueryClient();
  const openQ = useOpenTrainingsList();
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(() => new Set());
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    setEnrolledIds(loadEnrolledIds());
  }, []);

  const openTrainings = openQ.data ?? [];

  const enrollMut = useMutation({
    mutationFn: (trainingId: string) => hrmsService.selfEnrollTraining(trainingId),
    onSuccess: async (_data, trainingId) => {
      setEnrolledIds((prev) => {
        const next = new Set(prev);
        next.add(trainingId);
        saveEnrolledIds(next);
        return next;
      });
      await qc.invalidateQueries({ queryKey: ["learning", "trainings", "open"] });
      await qc.invalidateQueries({ queryKey: ["learning", "my-marks", trainingId] });
    },
  });

  const enroll = (trainingId: string) => {
    setEnrollingId(trainingId);
    enrollMut.mutate(trainingId, {
      onSettled: () => setEnrollingId(null),
      onError: (e) => alert(e instanceof Error ? e.message : String(e)),
    });
  };

  const sortedOpen = useMemo(
    () =>
      [...openTrainings].sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
          sensitivity: "base",
        })
      ),
    [openTrainings]
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Open Trainings</h2>
        <p className="text-sm text-wt-text-muted mt-1">
          Optional and hybrid trainings with status Scheduled. Everyone can browse and self-enroll.
          Mandatory trainings are only visible after HR assigns you.
        </p>
      </div>
      {openQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      ) : sortedOpen.length === 0 ? (
        <p className="text-sm text-wt-text-muted">
          No open trainings right now. HR must set type Optional or Hybrid and status Scheduled.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedOpen.map((row) => {
            const id = String(row.id ?? "").trim();
            const enrolled = enrolledIds.has(id);
            return (
              <div key={id || String(row.name)} className="relative flex flex-col">
                <TrainingCard row={row} href={trainingDetailHref(id)} />
                <div className="mt-2 flex justify-end px-1">
                  {enrolled ? (
                    <span className="text-xs font-medium text-emerald-700">Enrolled</span>
                  ) : (
                    <Button variant="brand" size="xs" type="button" className="px-3 py-1.5 text-xs" disabled={enrollMut.isPending && enrollingId === id} onClick={() => enroll(id)}
                    >
                      {enrollMut.isPending && enrollingId === id ? "Enrolling…" : "Enroll"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
