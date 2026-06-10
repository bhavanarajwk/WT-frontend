"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { exitInterviewService } from "@/services/exitInterview.service";
import type { ExitInterviewSubmissionDetail } from "@/types/exit-interview";

export function useUpdateExitInterviewMinutesOfMeeting(empId: string) {
  const queryClient = useQueryClient();
  const id = empId.trim();
  const queryKey = ["exit-interview", "submission", id, endpoints.exitInterview.submissionByEmpId(id)];

  return useMutation({
    mutationFn: async (minutes_of_meeting: string) => {
      const res = await exitInterviewService.updateMinutesOfMeeting(id, { minutes_of_meeting });
      return res.data ?? null;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData<ExitInterviewSubmissionDetail | null>(queryKey, data);
      } else {
        void queryClient.invalidateQueries({ queryKey: ["exit-interview", "submission", id] });
      }
    },
  });
}
