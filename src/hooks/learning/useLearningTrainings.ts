"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import {
  normalizeParticipantRows,
  participantListFromApiEnvelope,
} from "@/utils/learning/participants";
import { normalizeTrainingTrainerRows } from "@/utils/learning/trainers";
import {
  normalizeMyTrainingMarks,
  normalizeTrainingScoresHrSnapshot,
} from "@/utils/learning/trainingScores";
import {
  OPEN_TRAININGS_QUERY_KEY,
  TRAININGS_LIST_QUERY_KEY,
  fetchOpenTrainingsRows,
  fetchTrainingsListRows,
  findTrainingInList,
} from "@/utils/learning/trainingsList";

/** HR/Admin only — GET /api/v1/trainings */
export function useHrTrainingsList(enabled = true) {
  return useQuery({
    queryKey: [...TRAININGS_LIST_QUERY_KEY],
    enabled,
    queryFn: async () => {
      const res = await hrmsService.getTrainings();
      return toPagedRows(res.data ?? res);
    },
    staleTime: 30_000,
  });
}

/** @deprecated Use useHrTrainingsList for HR or useOpenTrainingsList for employees. */
export const useTrainingsList = useHrTrainingsList;

/** All employees — GET /api/v1/trainings/open */
export function useOpenTrainingsList(enabled = true) {
  return useQuery({
    queryKey: [...OPEN_TRAININGS_QUERY_KEY],
    enabled,
    queryFn: async () => {
      const res = await hrmsService.getOpenTrainings();
      return toPagedRows((res as { data?: unknown }).data ?? res);
    },
    staleTime: 30_000,
  });
}

/** Training catalog for the current access level (HR list vs open catalog). */
export function useLearningTrainingsList(hasHrAccess: boolean) {
  return useQuery({
    queryKey: hasHrAccess ? [...TRAININGS_LIST_QUERY_KEY] : [...OPEN_TRAININGS_QUERY_KEY],
    queryFn: async () => {
      if (hasHrAccess) {
        const res = await hrmsService.getTrainings();
        return toPagedRows(res.data ?? res);
      }
      const res = await hrmsService.getOpenTrainings();
      return toPagedRows((res as { data?: unknown }).data ?? res);
    },
    staleTime: 30_000,
  });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => hrmsService.createTraining(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [...TRAININGS_LIST_QUERY_KEY] });
      await qc.invalidateQueries({ queryKey: [...OPEN_TRAININGS_QUERY_KEY] });
      await qc.invalidateQueries({ queryKey: ["learning", "training"] });
    },
  });
}

export function useUpdateTraining(trainingId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (!trainingId?.trim()) throw new Error("Training id required.");
      return hrmsService.updateTraining(trainingId.trim(), payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [...TRAININGS_LIST_QUERY_KEY] });
      await qc.invalidateQueries({ queryKey: [...OPEN_TRAININGS_QUERY_KEY] });
      await qc.invalidateQueries({ queryKey: ["learning", "training"] });
    },
  });
}

/** Resolves training metadata from HR list or GET /trainings/open (employees). */
export function useTrainingDetail(
  trainingId: string | undefined,
  enabled: boolean,
  options?: { employeeView?: boolean }
) {
  const queryClient = useQueryClient();
  const employeeView = Boolean(options?.employeeView);
  return useQuery({
    queryKey: ["learning", "training", trainingId, employeeView ? "employee" : "hr"],
    enabled: Boolean(enabled && trainingId?.trim()),
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = employeeView
        ? await fetchOpenTrainingsRows(queryClient)
        : await fetchTrainingsListRows(queryClient);
      const found = findTrainingInList(rows, trainingId!);
      if (!found) {
        throw new Error(
          employeeView
            ? "Training not found in open catalog. Only scheduled optional/hybrid trainings are visible."
            : "Training not found in list."
        );
      }
      return found;
    },
  });
}

export function useTrainingSessions(trainingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["learning", "sessions", trainingId],
    enabled: Boolean(enabled && trainingId?.trim()),
    queryFn: async () => {
      const res = await hrmsService.getTrainingSessions(trainingId!);
      return toPagedRows(res.data ?? res);
    },
  });
}

export function useTrainingMaterials(trainingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["learning", "materials", trainingId],
    enabled: Boolean(enabled && trainingId?.trim()),
    queryFn: async () => {
      const res = await hrmsService.getTrainingMaterials(trainingId!);
      return toPagedRows(res.data ?? res);
    },
  });
}

export function useTrainingAssessments(trainingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["learning", "assessments", trainingId],
    enabled: Boolean(enabled && trainingId?.trim()),
    queryFn: async () => {
      const res = await hrmsService.getAssessments(trainingId!);
      return toPagedRows(res.data ?? res);
    },
  });
}

export function useTrainingAnalytics(trainingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["learning", "analytics", trainingId],
    enabled: Boolean(enabled && trainingId?.trim()),
    queryFn: async () => {
      const res = await hrmsService.getTrainingAnalytics(trainingId!);
      return ((res as { data?: unknown }).data ?? res) as Record<string, unknown>;
    },
  });
}

export function useTrainingTrainers(trainingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["learning", "trainers", trainingId],
    enabled: Boolean(enabled && trainingId?.trim()),
    staleTime: 30_000,
    queryFn: async () => {
      const res = await hrmsService.getTrainingTrainers(trainingId!);
      return normalizeTrainingTrainerRows((res as { data?: unknown }).data ?? res);
    },
  });
}

export function useTrainingScores(trainingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["learning", "scores", trainingId],
    enabled: Boolean(enabled && trainingId?.trim()),
    staleTime: 30_000,
    queryFn: async () => {
      const res = await hrmsService.getTrainingScores(trainingId!);
      return normalizeTrainingScoresHrSnapshot((res as { data?: unknown }).data ?? res);
    },
  });
}

/** GET /api/v1/trainings/{training_id}/my-marks — enrolled employee's published scores. */
export function useMyTrainingMarks(trainingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["learning", "my-marks", trainingId],
    enabled: Boolean(enabled && trainingId?.trim()),
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await hrmsService.getMyTrainingMarks(trainingId!);
      const normalized = normalizeMyTrainingMarks((res as { data?: unknown }).data ?? res);
      if (!normalized) {
        throw new Error("No marks returned for this training.");
      }
      return normalized;
    },
  });
}

export function useTrainingParticipants(trainingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["learning", "participants", trainingId],
    enabled: Boolean(enabled && trainingId?.trim()),
    queryFn: async () => {
      const res = await hrmsService.getTrainingParticipants(trainingId!);
      const fromEnvelope = participantListFromApiEnvelope(res);
      const raw = fromEnvelope.length ? fromEnvelope : toPagedRows((res as { data?: unknown }).data ?? res);
      return normalizeParticipantRows(raw);
    },
  });
}
