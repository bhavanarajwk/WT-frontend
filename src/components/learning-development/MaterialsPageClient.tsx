"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTrainingMaterials } from "@/hooks/learning/useLearningTrainings";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { MaterialVisibilityBadge } from "@/components/learning-development/MaterialVisibilityBadge";
import { DataTable, FileField, InputField, SelectField } from "@/components/learning-development/ui/forms";
import { TITLE_SORT_OPTIONS } from "@/utils/listSort";
import {
  isMaterialVisibility,
  MATERIAL_VISIBILITY_OPTIONS,
} from "@/utils/learning/materialVisibility";
import { hrmsService } from "@/services/hrms.service";
import { createEmptyMaterialForm } from "@/utils/learningFormState";

export function MaterialsPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const [trainingId, setTrainingId] = useState("");
  const [form, setForm] = useState(createEmptyMaterialForm);
  const [file, setFile] = useState<File | null>(null);
  const qc = useQueryClient();
  const materialsQ = useTrainingMaterials(trainingId, Boolean(trainingId.trim()));

  const materialDisplayRows = useMemo(
    () =>
      (materialsQ.data ?? []).map((row) => ({
        ...row,
        visibility: <MaterialVisibilityBadge value={row.visibility} />,
      })),
    [materialsQ.data]
  );

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file.");
      if (!form.visibility) throw new Error("Please select visibility.");
      await hrmsService.uploadTrainingMaterial(trainingId, {
        title: form.title.trim(),
        visibility: form.visibility,
        materialFile: file,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "materials", trainingId] });
      setForm(createEmptyMaterialForm());
      setFile(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Materials</h1>
          <p className="text-sm text-wt-text-muted mt-1">Upload PDFs and control visibility.</p>
        </div>
        {trainingId ? (
          <Link href={`/dashboard/learning-development/trainings/${encodeURIComponent(trainingId)}?tab=materials`} className="text-sm font-medium text-indigo-600 hover:underline self-center">
            Detail view
          </Link>
        ) : null}
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={setTrainingId} required />

      {hasHrAccess ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <div className="flex flex-wrap lg:flex-nowrap items-end gap-3">
            <div className="min-w-[140px] flex-1">
              <InputField label="Title" required value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} />
            </div>
            <div className="w-full sm:w-44 shrink-0">
              <SelectField
                label="Visibility"
                placeholder="Select visibility"
                required
                value={form.visibility}
                options={MATERIAL_VISIBILITY_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                onChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    visibility: isMaterialVisibility(v) ? v : "",
                  }))
                }
              />
            </div>
            <div className="min-w-[160px] flex-1">
              <FileField label="PDF" required accept=".pdf,application/pdf" onPick={setFile} />
            </div>
            <Button variant="brand" size="sm" type="button" className="px-4 py-2 text-sm shrink-0" disabled={uploadMut.isPending || !trainingId || !file} onClick={() => uploadMut.mutate(undefined, { onError: (e) => alert(String(e)) })}
            >
              Upload
            </Button>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <DataTable
          title="List of materials"
          columns={["title", "material_url", "visibility"]}
          rows={materialDisplayRows}
          emptyLabel="No materials."
          sortOptions={TITLE_SORT_OPTIONS}
        />
      </section>
    </div>
  );
}
