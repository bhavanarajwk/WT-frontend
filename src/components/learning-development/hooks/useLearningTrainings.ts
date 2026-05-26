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
  TRAININGS_LIST_QUERY_KEY,
  fetchTrainingsListRows,
  findTrainingInList,
} from "@/utils/learning/trainingsList";

export function useTrainingsList() {
  return useQuery({
    queryKey: [...TRAININGS_LIST_QUERY_KEY],
    queryFn: async () => {
      const res = await hrmsService.getTrainings();
      return toPagedRows(res.data ?? res);
    },
    staleTime: 30_000,
  });
}

export function useOpenTrainingsList() {
  return useQuery({
    queryKey: ["learning", "trainings", "open"],
    queryFn: async () => {
      const res = await hrmsService.getOpenTrainings();
      return toPagedRows(res.data ?? res);
    },
  });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => hrmsService.createTraining(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning"] });
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
      await qc.invalidateQueries({ queryKey: ["learning"] });
    },
  });
}

/** Resolves one training from GET /trainings list (backend has no GET /trainings/:id). */
export function useTrainingDetail(trainingId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["learning", "training", trainingId],
    enabled: Boolean(enabled && trainingId?.trim()),
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await fetchTrainingsListRows(queryClient);
      const found = findTrainingInList(rows, trainingId!);
      if (!found) throw new Error("Training not found in list.");
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
