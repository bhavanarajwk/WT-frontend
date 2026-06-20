"use client";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { ApiError } from "@/api/error";
import { useOpenTrainingsList } from "@/hooks/learning/useLearningTrainings";
import { hrmsService } from "@/services/hrms.service";
import { formatApiDateDisplay } from "@/utils/apiDate";
import { normalizeMyTrainingMarks } from "@/utils/learning/trainingScores";
import { TableRowsSkeleton } from "@/components/dashboard/ui/SectionSkeleton";
import {
  PROFILE_TABLE_BODY_CELL,
  PROFILE_TABLE_CLASS,
  PROFILE_TABLE_HEAD_CELL,
  PROFILE_TABLE_SCROLL,
} from "@/components/dashboard/profile/profileTableStyles";

function displayValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text !== "—" ? text : "—";
}

function readTrainingName(row: Record<string, unknown>): string {
  return displayValue(row.name ?? row.training_name ?? row.trainingName);
}

function readTrainingStatus(row: Record<string, unknown>): string {
  return displayValue(row.status ?? row.enrollment_status ?? row.enrollmentStatus);
}

function readCompletionDate(row: Record<string, unknown>): string {
  const status = String(row.status ?? row.enrollment_status ?? row.enrollmentStatus ?? "")
    .trim()
    .toUpperCase();
  const isCompleted = status === "COMPLETED" || status === "COMPLETE" || status === "FINISHED";
  if (!isCompleted) return "—";

  const raw =
    row.completion_date ??
    row.completionDate ??
    row.completed_at ??
    row.completedAt ??
    row.end_date ??
    row.endDate;
  const text = String(raw ?? "").trim();
  if (!text || text === "—") return "—";
  return formatApiDateDisplay(text);
}

function readAssessmentScore(
  trainingId: string,
  marksByTrainingId: Map<string, ReturnType<typeof normalizeMyTrainingMarks>>
): string {
  const marks = marksByTrainingId.get(trainingId);
  if (marks?.finalScorePercent == null) return "—";
  return `${marks.finalScorePercent}%`;
}

function trainingRowKey(row: Record<string, unknown>, index: number): string {
  const id = String(row.id ?? "").trim();
  return id || `training-${index}`;
}

export function ProfileEmployeeTrainingsSection({ enabled = true }: { enabled?: boolean }) {
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

  const marksByTrainingId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof normalizeMyTrainingMarks>>();
    openTrainingIds.forEach((trainingId, index) => {
      map.set(trainingId, myMarksQueries[index]?.data ?? null);
    });
    return map;
  }, [openTrainingIds, myMarksQueries]);

  const rows = useMemo(
    () =>
      [...(openTrainingsQ.data ?? [])].sort((a, b) =>
        readTrainingName(a).localeCompare(readTrainingName(b), undefined, { sensitivity: "base" })
      ),
    [openTrainingsQ.data]
  );

  const loading = openTrainingsQ.isLoading;

  return (
    <div className="mt-8 border-t border-wt-border pt-6">
      <h4 className="mb-3 text-sm font-semibold text-wt-text">Training Details</h4>
        {loading ? (
          <TableRowsSkeleton rows={3} columns={4} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-wt-text-muted">No trainings found.</p>
        ) : (
          <div className={PROFILE_TABLE_SCROLL}>
            <WtTable className={PROFILE_TABLE_CLASS}>
              <TableHeader className="bg-wt-surface-1 [&_tr]:border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={PROFILE_TABLE_HEAD_CELL}>Training Name</TableHead>
                  <TableHead className={PROFILE_TABLE_HEAD_CELL}>Assessment Score</TableHead>
                  <TableHead className={PROFILE_TABLE_HEAD_CELL}>Completion Date</TableHead>
                  <TableHead className={PROFILE_TABLE_HEAD_CELL}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const trainingId = String(row.id ?? "").trim();
                  return (
                    <TableRow key={trainingRowKey(row, index)}>
                      <TableCell className={`${PROFILE_TABLE_BODY_CELL} whitespace-nowrap`}>
                        {readTrainingName(row)}
                      </TableCell>
                      <TableCell className={`${PROFILE_TABLE_BODY_CELL} whitespace-nowrap`}>
                        {readAssessmentScore(trainingId, marksByTrainingId)}
                      </TableCell>
                      <TableCell className={`${PROFILE_TABLE_BODY_CELL} whitespace-nowrap`}>
                        {readCompletionDate(row)}
                      </TableCell>
                      <TableCell className={`${PROFILE_TABLE_BODY_CELL} whitespace-nowrap`}>
                        {readTrainingStatus(row)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </WtTable>
          </div>
        )}
    </div>
  );
}
