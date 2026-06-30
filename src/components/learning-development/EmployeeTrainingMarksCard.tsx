"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";
import { TrainingStatusBadge } from "@/components/dashboard/ui/WtStatusBadge";
import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { LEARNING_BASE } from "@/constants/learningNav";
import {
  useHrTrainingsList,
  useOpenTrainingsList,
} from "@/hooks/learning/useLearningTrainings";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import {
  findParticipantScoreForTrainee,
  normalizeMyTrainingMarks,
  normalizeTrainingScoresHrSnapshot,
  resolveOverallScorePercent,
  type MyTrainingMarks,
  type ParticipantTrainingScore,
} from "@/utils/learning/trainingScores";

type HrTrainingMarks = {
  trainingId: string;
  trainingName: string;
  enrollmentStatus: string;
  participant: ParticipantTrainingScore | null;
  assessments: Array<{ id: string; name: string; weightPercent: number; published: boolean }>;
  overall: number | null;
};

function formatTrainingScoresLabel(overall: number | null, hasAssessments: boolean): string {
  if (overall != null) return `${overall}%`;
  if (!hasAssessments) return "No assessment scores yet.";
  return "—";
}

function TrainingScoresTable({
  rows,
  scrollChain = false,
  detailed = false,
}: {
  rows: Array<{
    trainingId: string;
    trainingName: string;
    scoresLabel: string;
    completionDate?: string;
    status?: string;
  }>;
  scrollChain?: boolean;
  detailed?: boolean;
}) {
  return (
    <ScrollableTable
      scrollChain={scrollChain}
      maxHeightClass={scrollChain ? "max-h-[min(48vh,420px)]" : "max-h-[min(70vh,520px)]"}
      className="!rounded-lg"
    >
      <WtTable>
        <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
          <TableRow className="hover:bg-transparent">
            <TableHead>Training</TableHead>
            <TableHead>{detailed ? "Score" : "Scores"}</TableHead>
            {detailed ? <TableHead>Status</TableHead> : null}
            {detailed ? <TableHead>Completion Date</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.trainingId}>
              <TableCell className="px-3 py-2">{row.trainingName}</TableCell>
              <TableCell className="px-3 py-2 tabular-nums">{row.scoresLabel}</TableCell>
              {detailed ? (
                <TableCell className="px-3 py-2 whitespace-nowrap">
                  {row.status ? <TrainingStatusBadge status={row.status} /> : "—"}
                </TableCell>
              ) : null}
              {detailed ? (
                <TableCell className="px-3 py-2 whitespace-nowrap">
                  {row.completionDate ?? "—"}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </WtTable>
    </ScrollableTable>
  );
}

function EmployeeTrainingMarksCardEmployee({
  enabled = true,
  scrollChain = false,
}: {
  enabled?: boolean;
  scrollChain?: boolean;
}) {
  const openTrainingsQ = useOpenTrainingsList(enabled);

  const openTrainingIds = useMemo(
    () =>
      (openTrainingsQ.data ?? [])
        .map((row) => String(row.id ?? "").trim())
        .filter(Boolean),
    [openTrainingsQ.data]
  );

  const myMarksQueries = useQueries({
    queries: openTrainingIds.map((trainingId) => ({
      queryKey: ["learning", "my-marks", trainingId],
      enabled: Boolean(enabled),
      retry: false,
      staleTime: 30_000,
      queryFn: async () => {
        try {
          const res = await hrmsService.getMyTrainingMarks(trainingId);
          return normalizeMyTrainingMarks((res as { data?: unknown }).data ?? res);
        } catch (error) {
          if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
            return null;
          }
          throw error;
        }
      },
    })),
  });

  const employeeMarks = useMemo(
    () =>
      myMarksQueries
        .map((q) => q.data)
        .filter((m): m is MyTrainingMarks => Boolean(m && m.assessments.length)),
    [myMarksQueries]
  );

  const tableRows = useMemo(
    () =>
      employeeMarks
        .map((marks) => ({
          trainingId: marks.trainingId,
          trainingName: marks.trainingName,
          scoresLabel: formatTrainingScoresLabel(marks.finalScorePercent, marks.assessments.length > 0),
        }))
        .sort((a, b) => a.trainingName.localeCompare(b.trainingName)),
    [employeeMarks]
  );

  const loading = openTrainingsQ.isLoading || myMarksQueries.some((q) => q.isLoading);

  return (
    <section className="rounded-xl border border-wt-border p-5 md:p-6 space-y-4">
      <h4 className="text-base font-semibold tracking-tight">Training Scores</h4>

      {loading ? <SectionLoading label="Loading training scores…" /> : null}

      {!loading && tableRows.length ? (
        <TrainingScoresTable rows={tableRows} scrollChain={scrollChain} />
      ) : null}

      {!loading && !tableRows.length ? (
        <p className="text-sm text-wt-text-muted">
          No published marks yet. Enroll in an open training and check back after HR publishes scores.
        </p>
      ) : null}
    </section>
  );
}

function EmployeeTrainingMarksCardHr({
  targetUserId,
  targetEmail,
  enabled = true,
  scrollChain = false,
}: {
  targetUserId?: string;
  targetEmail?: string;
  enabled?: boolean;
  scrollChain?: boolean;
}) {
  const allTrainingsQ = useHrTrainingsList(enabled);

  const hrTrainingIds = useMemo(
    () =>
      (allTrainingsQ.data ?? [])
        .map((row) => String(row.id ?? "").trim())
        .filter(Boolean),
    [allTrainingsQ.data]
  );

  const trainingNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of allTrainingsQ.data ?? []) {
      const id = String(row.id ?? "").trim();
      if (!id) continue;
      map.set(id, String(row.name ?? `Training ${id}`).trim());
    }
    return map;
  }, [allTrainingsQ.data]);

  const hrScoresQueries = useQueries({
    queries: hrTrainingIds.map((trainingId) => ({
      queryKey: ["learning", "scores", trainingId],
      enabled: Boolean(enabled),
      staleTime: 30_000,
      queryFn: async () => {
        const res = await hrmsService.getTrainingScores(trainingId);
        return normalizeTrainingScoresHrSnapshot((res as { data?: unknown }).data ?? res);
      },
    })),
  });

  const hrMarks = useMemo((): HrTrainingMarks[] => {
    if (!targetUserId?.trim()) return [];
    const out: HrTrainingMarks[] = [];
    for (const query of hrScoresQueries) {
      const snapshot = query.data;
      if (!snapshot) continue;
      const participant = findParticipantScoreForTrainee(
        snapshot.participants,
        targetUserId,
        targetEmail
      );
      if (!participant) continue;
      const assessments = snapshot.assessments.length
        ? snapshot.assessments.map((a) => ({
            id: a.id,
            name: a.name,
            weightPercent: a.weightPercent,
            published: Boolean(a.marksPublishedAt),
          }))
        : [];
      const overall = resolveOverallScorePercent(
        participant,
        assessments.map((a) => ({ id: a.id, weight_percent: a.weightPercent }))
      );
      out.push({
        trainingId: snapshot.trainingId,
        trainingName: trainingNameById.get(snapshot.trainingId) ?? `Training ${snapshot.trainingId}`,
        enrollmentStatus: participant.isCompleted ? "COMPLETED" : "ENROLLED",
        participant,
        assessments,
        overall,
      });
    }
    return out.sort((a, b) => a.trainingName.localeCompare(b.trainingName));
  }, [targetUserId, targetEmail, hrScoresQueries, trainingNameById]);

  const tableRows = useMemo(
    () =>
      hrMarks.map((entry) => ({
        trainingId: entry.trainingId,
        trainingName: entry.trainingName,
        scoresLabel: formatTrainingScoresLabel(entry.overall, entry.assessments.length > 0),
        completionDate: undefined,
        status: entry.enrollmentStatus,
      })),
    [hrMarks]
  );

  const loading = allTrainingsQ.isLoading || hrScoresQueries.some((q) => q.isLoading);

  return (
    <Card className="w-full p-0">
      <CardHeader className="flex-row items-center justify-between space-y-0 px-5 py-3 sm:px-6">
        <CardTitle className="text-base">Training Scores</CardTitle>
        <Link
          href={`${LEARNING_BASE}/trainings`}
          className="shrink-0 text-sm font-medium hover:underline"
          style={{ color: "var(--wt-brand)" }}
        >
          Manage Trainings
        </Link>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-3 px-5 py-3 sm:px-6">
        {loading ? <SectionLoading label="Loading training scores…" /> : null}

        {!loading && tableRows.length ? (
          <TrainingScoresTable rows={tableRows} scrollChain={scrollChain} detailed />
        ) : null}

        {!loading && !tableRows.length ? (
          <p className="text-sm text-wt-text-muted">
            No training scores for this employee. Assign them as a trainee and save scores in
            Learning &amp; Development.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Employee profile: published marks via GET …/my-marks. HR: scores via GET …/scores. */
export function EmployeeTrainingMarksCard({
  variant,
  targetUserId,
  targetEmail,
  enabled = true,
  scrollChain = false,
}: {
  variant: "employee" | "hr";
  targetUserId?: string;
  targetEmail?: string;
  enabled?: boolean;
  scrollChain?: boolean;
}) {
  if (variant === "hr") {
    return (
      <EmployeeTrainingMarksCardHr
        targetUserId={targetUserId}
        targetEmail={targetEmail}
        enabled={enabled}
        scrollChain={scrollChain}
      />
    );
  }
  return <EmployeeTrainingMarksCardEmployee enabled={enabled} scrollChain={scrollChain} />;
}
