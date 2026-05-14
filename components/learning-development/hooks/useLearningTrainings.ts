"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hrmsService } from "@/src/services/hrms.service";
import { toPagedRows } from "@/src/lib/apiRows";
import {
  normalizeParticipantRows,
  participantListFromApiEnvelope,
} from "@/src/lib/learning/participants";

export function useTrainingsList() {
  return useQuery({
    queryKey: ["learning", "trainings", "list"],
    queryFn: async () => {
      const res = await hrmsService.getTrainings();
      return toPagedRows(res.data ?? res);
    },
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

export function useTrainingDetail(trainingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["learning", "training", trainingId],
    enabled: Boolean(enabled && trainingId?.trim()),
    queryFn: async () => {
      const res = await hrmsService.getTrainingById(trainingId!);
      return ((res as { data?: unknown }).data ?? res) as Record<string, unknown>;
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
    queryFn: async () => {
      const res = await hrmsService.getTrainingTrainers(trainingId!);
      const data = (res as { data?: unknown }).data ?? res;
      const asRows = toPagedRows(data);
      if (asRows.length) return asRows;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const o = data as Record<string, unknown>;
        const ids = o.trainer_user_ids ?? o.trainerUserIds;
        if (Array.isArray(ids) && ids.length) {
          return ids.map((id, idx) => ({
            id: idx + 1,
            trainer_user_id: id,
            user_id: id,
          })) as Array<Record<string, unknown>>;
        }
      }
      return [];
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
