"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  useCreateTraining,
  useHrTrainingsList,
  useUpdateTraining,
} from "@/hooks/learning/useLearningTrainings";
import { useLearningTrainerDirectory } from "@/hooks/learning/useLearningTrainerDirectory";
import { TrainingCard } from "@/components/learning-development/TrainingCard";
import { InputField, SelectField, Sheet } from "@/components/learning-development/ui/forms";
import { TableSortHeader } from "@/components/dashboard/ui/TableSortHeader";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  activeSortDirectionForColumn,
  applyListSort,
  TRAINING_SORT_OPTIONS,
  toggleColumnSort,
} from "@/utils/listSort";
import { trainingDurationDaysFromRange } from "@/utils/learning/trainingDates";
import { normalizeToApiDate } from "@/utils/apiDate";
import { resolveLearningTrainerUserId } from "@/utils/learning/resolveTrainerUserId";
import { createEmptyTrainingForm } from "@/utils/learningFormState";
import { hrmsService } from "@/services/hrms.service";
import { EmployeeLearningCatalog } from "@/components/learning-development/EmployeeLearningCatalog";

function EmployeeTrainingsView() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Trainings</h1>
        <p className="text-sm text-wt-text-muted">
          Optional trainings are open to everyone. Mandatory trainings appear only when HR assigns you.
        </p>
      </div>
      <EmployeeLearningCatalog />
    </section>
  );
}

function HrTrainingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: rows = [], isLoading, refetch } = useHrTrainingsList();
  const { data: trainerOptions = [] } = useLearningTrainerDirectory();
  const createMut = useCreateTraining();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortId, setSortId] = useState(TRAINING_SORT_OPTIONS[0].id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(createEmptyTrainingForm);
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
    return applyListSort(list, sortId, TRAINING_SORT_OPTIONS);
  }, [rows, search, statusFilter, sortId]);

  const cardPagination = useClientPagination(filtered, {
    resetKeys: [search, statusFilter, sortId],
  });

  function openCreate() {
    setEditingId(null);
    setForm(createEmptyTrainingForm());
    setCreateTrainerId("");
    setSheetOpen(true);
  }

  useEffect(() => {
    if (!searchParams.get("create")) return;
    setEditingId(null);
    setForm(createEmptyTrainingForm());
    setCreateTrainerId("");
    setSheetOpen(true);
    router.replace("/dashboard/learning-development/trainings", { scroll: false });
  }, [searchParams, router]);

  function openEdit(row: Record<string, unknown>) {
    const id = String(row.id ?? "").trim();
    setEditingId(id);
    setForm({
      name: String(row.name ?? "").trim(),
      category: String(row.category ?? "TECHNICAL").trim(),
      type: String(row.type ?? "OPTIONAL").trim(),
      description: String(row.description ?? "").trim(),
      start_date: normalizeToApiDate(String(row.start_date ?? row.training_start ?? "")),
      end_date: normalizeToApiDate(String(row.end_date ?? row.training_end ?? "")),
      status: String(row.status ?? "DRAFT").trim(),
    });
    setSheetOpen(true);
  }

  async function submitForm() {
    const sd = form.start_date.trim();
    const ed = form.end_date.trim();
    if (!sd || !ed) throw new Error("Start and end dates are required.");
    if (!form.category) throw new Error("Please select category.");
    if (!form.type) throw new Error("Please select type.");
    if (!form.status) throw new Error("Please select status.");
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
    setForm(createEmptyTrainingForm());
    setCreateTrainerId("");
    await refetch();
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-wt-border pb-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Trainings</h1>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="btn-primary px-3 py-2 text-sm"
              onClick={() => refetch()}
            >
              Refresh
            </button>
            <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={openCreate}>
              New training
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
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
          <div className="flex flex-wrap items-center gap-3 pb-2">
            <TableSortHeader
              label="Date"
              activeDirection={activeSortDirectionForColumn(
                "start_date",
                sortId,
                TRAINING_SORT_OPTIONS
              )}
              sortable
              onSort={() =>
                setSortId(toggleColumnSort("start_date", sortId, TRAINING_SORT_OPTIONS))
              }
            />
            <TableSortHeader
              label="Name"
              activeDirection={activeSortDirectionForColumn("name", sortId, TRAINING_SORT_OPTIONS)}
              sortable
              onSort={() => setSortId(toggleColumnSort("name", sortId, TRAINING_SORT_OPTIONS))}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-wt-text-muted py-8 text-center">Loading trainings…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-wt-text-muted py-8 text-center">No trainings match your filters.</p>
        ) : (
          <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cardPagination.pageItems.map((row) => {
              const id = String(row.id ?? "").trim();
              const href = `/dashboard/learning-development/trainings/${encodeURIComponent(id)}`;
              return (
                <TrainingCard
                  key={id || String(row.name)}
                  row={row}
                  href={href}
                  showEdit
                  onEdit={() => openEdit(row)}
                />
              );
            })}
          </div>
          <ListPagination
            page={cardPagination.page}
            totalPages={cardPagination.totalPages}
            totalItems={cardPagination.totalItems}
            rangeStart={cardPagination.rangeStart}
            rangeEnd={cardPagination.rangeEnd}
            pageSize={cardPagination.pageSize}
            pageSizeOptions={cardPagination.pageSizeOptions}
            onPageChange={cardPagination.setPage}
            onPageSizeChange={cardPagination.setPageSize}
          />
          </>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        title={editingId ? "Edit training" : "Create training"}
        onClose={() => setSheetOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost px-4 py-2 rounded-lg border border-wt-border"
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary px-4 py-2"
              disabled={createMut.isPending || updateMut.isPending}
              onClick={() =>
                submitForm().catch((e) => alert(e instanceof Error ? e.message : "Unable to save"))
              }
            >
              Save
            </button>
          </div>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField label="Name" required value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
          <SelectField
            label="Category"
            placeholder="Select category"
            required
            value={form.category}
            options={["PROFESSIONAL", "TECHNICAL", "SOFT_SKILLS"]}
            onChange={(v) => setForm((p) => ({ ...p, category: v }))}
          />
          <SelectField
            label="Type"
            placeholder="Select type"
            required
            value={form.type}
            options={["MANDATORY", "OPTIONAL", "HYBRID"]}
            onChange={(v) => setForm((p) => ({ ...p, type: v }))}
          />
          <SelectField
            label="Status"
            placeholder="Select status"
            required
            value={form.status}
            options={["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]}
            onChange={(v) => setForm((p) => ({ ...p, status: v }))}
          />
          <InputField
            label="Start date"
            type="date"
            required
            value={form.start_date}
            onChange={(v) => setForm((p) => ({ ...p, start_date: v }))}
          />
          <InputField
            label="End date"
            type="date"
            required
            value={form.end_date}
            onChange={(v) => setForm((p) => ({ ...p, end_date: v }))}
          />
          <div className="sm:col-span-2">
            <InputField
              label="Description"
              value={form.description}
              onChange={(v) => setForm((p) => ({ ...p, description: v }))}
            />
          </div>
          {!editingId ? (
            <div className="sm:col-span-2">
              <SelectField
                label="Trainer (optional, assigned after create)"
                value={createTrainerId}
                onChange={setCreateTrainerId}
                placeholder="Select trainer"
                options={trainerOptions.map((t) => ({ value: t.id, label: t.label }))}
              />
            </div>
          ) : null}
        </div>
      </Sheet>
    </section>
  );
}

export function TrainingsPageClient() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  return hasHrAccess ? <HrTrainingsView /> : <EmployeeTrainingsView />;
}
