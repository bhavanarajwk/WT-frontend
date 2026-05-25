"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  useCreateTraining,
  useTrainingsList,
  useUpdateTraining,
} from "@/components/learning-development/hooks/useLearningTrainings";
import { useLearningTrainerDirectory } from "@/components/learning-development/hooks/useLearningTrainerDirectory";
import { TrainingCard } from "@/components/learning-development/TrainingCard";
import { InputField, SelectField, Sheet } from "@/components/learning-development/ui/forms";
import { trainingDurationDaysFromRange } from "@/src/lib/learning/trainingDates";
import { resolveLearningTrainerUserId } from "@/src/lib/learning/resolveTrainerUserId";
import { hrmsService } from "@/src/services/hrms.service";
import { OpenEnrollPageClient } from "@/components/learning-development/OpenEnrollPageClient";

export function TrainingsPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const { data: rows = [], isLoading, refetch } = useTrainingsList();
  const { data: trainerOptions = [] } = useLearningTrainerDirectory();
  const createMut = useCreateTraining();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "TECHNICAL",
    type: "OPTIONAL",
    description: "",
    start_date: "",
    end_date: "",
    status: "DRAFT",
  });
  const [createTrainerId, setCreateTrainerId] = useState("");

  const updateMut = useUpdateTraining(editingId ?? undefined);

  const filtered = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const name = String(r.name ?? "").toLowerCase();
        const id = String(r.id ?? "");
        return name.includes(q) || id.includes(q);
      });
    }
    if (statusFilter !== "ALL") {
      list = list.filter((r) => String(r.status ?? "").toUpperCase() === statusFilter);
    }
    return list;
  }, [rows, search, statusFilter]);

  function openCreate() {
    setEditingId(null);
    setForm({
      name: "",
      category: "TECHNICAL",
      type: "OPTIONAL",
      description: "",
      start_date: "",
      end_date: "",
      status: "DRAFT",
    });
    setCreateTrainerId("");
    setSheetOpen(true);
  }

  function openEdit(row: Record<string, unknown>) {
    const id = String(row.id ?? "").trim();
    setEditingId(id);
    setForm({
      name: String(row.name ?? "").trim(),
      category: String(row.category ?? "TECHNICAL").trim(),
      type: String(row.type ?? "OPTIONAL").trim(),
      description: String(row.description ?? "").trim(),
      start_date: String(row.start_date ?? row.training_start ?? "").slice(0, 10),
      end_date: String(row.end_date ?? row.training_end ?? "").slice(0, 10),
      status: String(row.status ?? "DRAFT").trim(),
    });
    setSheetOpen(true);
  }

  async function submitForm() {
    const sd = form.start_date.trim();
    const ed = form.end_date.trim();
    if (!sd || !ed) throw new Error("Start and end dates are required.");
    const duration_days = trainingDurationDaysFromRange(sd, ed);
    if (Number.isNaN(duration_days)) throw new Error("End date must be on or after start date.");
    const payload = {
      name: form.name.trim() || undefined,
      category: form.category,
      type: form.type,
      description: form.description.trim() || null,
      duration_days,
      start_date: sd,
      end_date: ed,
      status: form.status,
    };
    if (editingId) {
      await updateMut.mutateAsync(payload);
    } else {
      const name = form.name.trim();
      if (!name) throw new Error("Training name is required.");
      const res = await createMut.mutateAsync({
        ...payload,
        name,
      });
      const created = ((res as { data?: unknown }).data ?? res) as Record<string, unknown> | null;
      const createdTrainingId = String(created?.id ?? "").trim();
      if (createdTrainingId && createTrainerId.trim()) {
        const idNum = await resolveLearningTrainerUserId(createTrainerId);
        await hrmsService.assignTrainers(createdTrainingId, [idNum]);
      }
    }
    setSheetOpen(false);
    await refetch();
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-wt-border pb-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Trainings</h1>
            <p className="text-sm text-wt-text-muted mt-1">
              Open a training card to manage sessions, trainers, trainees, attendance, scores, and analytics.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="btn-primary px-3 py-2 text-sm"
              onClick={() => refetch()}
            >
              Refresh
            </button>
            {hasHrAccess ? (
              <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={openCreate}>
                New training
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 w-full sm:max-w-md sm:flex-1">
              <InputField label="Search" value={search} onChange={setSearch} />
            </div>
            <div className="w-full sm:w-52 sm:flex-shrink-0">
              <SelectField
                label="Status"
                value={statusFilter}
                options={["ALL", "DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]}
                onChange={setStatusFilter}
              />
            </div>
          </div>
          <p className="text-sm text-wt-text-muted sm:whitespace-nowrap sm:pb-2 sm:text-right">
            {isLoading ? "Loading…" : `${filtered.length} result(s)`}
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-wt-text-muted py-8 text-center">Loading trainings…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-wt-text-muted py-8 text-center">No trainings match your filters.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row) => {
              const id = String(row.id ?? "").trim();
              const href = `/dashboard/learning-development/trainings/${encodeURIComponent(id)}`;
              return (
                <TrainingCard
                  key={id || String(row.name)}
                  row={row}
                  href={href}
                  showEdit={hasHrAccess}
                  onEdit={() => openEdit(row)}
                />
              );
            })}
          </div>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        title={editingId ? "Edit training" : "Create training"}
        onClose={() => setSheetOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost px-4 py-2 rounded-lg border border-wt-border" onClick={() => setSheetOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary px-4 py-2"
              disabled={createMut.isPending || updateMut.isPending}
              onClick={() => submitForm().catch((e) => alert(e instanceof Error ? e.message : "Unable to save"))}
            >
              Save
            </button>
          </div>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField label="Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
          <SelectField
            label="Category"
            value={form.category}
            options={["PROFESSIONAL", "TECHNICAL", "SOFT_SKILLS"]}
            onChange={(v) => setForm((p) => ({ ...p, category: v }))}
          />
          <SelectField
            label="Type"
            value={form.type}
            options={["MANDATORY", "OPTIONAL", "HYBRID"]}
            onChange={(v) => setForm((p) => ({ ...p, type: v }))}
          />
          <SelectField
            label="Status"
            value={form.status}
            options={["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]}
            onChange={(v) => setForm((p) => ({ ...p, status: v }))}
          />
          <InputField label="Start date" type="date" value={form.start_date} onChange={(v) => setForm((p) => ({ ...p, start_date: v }))} />
          <InputField label="End date" type="date" value={form.end_date} onChange={(v) => setForm((p) => ({ ...p, end_date: v }))} />
          <div className="sm:col-span-2">
            <InputField label="Description" value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} />
          </div>
          {!editingId && hasHrAccess ? (
            <div className="sm:col-span-2">
              <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                Trainer (optional, assigned after create)
                <select
                  className="input-field px-3 py-2 text-sm"
                  value={createTrainerId}
                  onChange={(e) => setCreateTrainerId(e.target.value)}
                >
                  <option value="">Select trainer</option>
                  {trainerOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      </Sheet>

      {!hasHrAccess ? <OpenEnrollPageClient /> : null}
    </section>
  );
}
