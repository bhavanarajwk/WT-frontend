"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTrainingAssessments } from "@/hooks/learning/useLearningTrainings";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { DataTable, FileField, InputField } from "@/components/learning-development/ui/forms";
import { TITLE_SORT_OPTIONS } from "@/utils/listSort";
import { hrmsService } from "@/services/hrms.service";
import { createEmptyAssessmentForm } from "@/utils/learningFormState";

export function AssessmentsPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const [trainingId, setTrainingId] = useState("");
  const [form, setForm] = useState(createEmptyAssessmentForm);
  const [file, setFile] = useState<File | null>(null);
  const qc = useQueryClient();
  const assessmentsQ = useTrainingAssessments(trainingId, Boolean(trainingId.trim()));

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a PDF.");
      await hrmsService.uploadAssessment(trainingId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        weight_percent: Number(form.weight_percent || "0"),
        assessmentFile: file,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "assessments", trainingId] });
      setForm(createEmptyAssessmentForm());
      setFile(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
          <p className="text-sm text-wt-text-muted mt-1">Define weighted assessments with supporting documents.</p>
        </div>
        {trainingId ? (
          <Link href={`/dashboard/learning-development/trainings/${encodeURIComponent(trainingId)}?tab=assessments`} className="text-sm font-medium text-indigo-600 hover:underline self-center">
            Detail view
          </Link>
        ) : null}
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} required />

      {hasHrAccess ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap lg:flex-nowrap items-end gap-3">
              <div className="min-w-[140px] flex-1">
                <InputField label="Name" required value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
              </div>
              <div className="w-28 shrink-0">
                <InputField label="Weight %" value={form.weight_percent} onChange={(v) => setForm((p) => ({ ...p, weight_percent: v }))} />
              </div>
              <div className="min-w-[160px] flex-1">
                <FileField label="Assessment PDF" required accept=".pdf,application/pdf" onPick={setFile} />
              </div>
              <Button variant="brand" size="sm" type="button" className="px-4 py-2 text-sm shrink-0" disabled={uploadMut.isPending || !trainingId || !file} onClick={() => uploadMut.mutate(undefined, { onError: (e) => alert(String(e)) })}
              >
                Upload
              </Button>
            </div>
            <div className="w-full">
              <InputField label="Description" value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} />
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <DataTable
          title="List of assessments"
          columns={["name", "description", "file_url", "weight_percent"]}
          rows={assessmentsQ.data ?? []}
          emptyLabel="No assessments."
          sortOptions={TITLE_SORT_OPTIONS}
        />
      </section>
    </div>
  );
}
