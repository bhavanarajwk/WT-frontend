"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  useTrainingAnalytics,
  useTrainingAssessments,
  useTrainingDetail,
  useTrainingMaterials,
  useTrainingParticipants,
  useTrainingSessions,
  useTrainingTrainers,
} from "@/hooks/learning/useLearningTrainings";
import { useLearningTrainerDirectory } from "@/hooks/learning/useLearningTrainerDirectory";
import { AttendancePageClient } from "@/components/learning-development/AttendancePageClient";
import { EmployeeTrainingMyMarks } from "@/components/learning-development/EmployeeTrainingMyMarks";
import { ScoresPageClient } from "@/components/learning-development/ScoresPageClient";
import { TrainingStatusControl } from "@/components/learning-development/TrainingStatusControl";
import { SelectField } from "@/components/dashboard/ui/forms";
import { AssignedTrainersList } from "@/components/learning-development/AssignedTrainersList";
import { MaterialVisibilityBadge } from "@/components/learning-development/MaterialVisibilityBadge";
import { TrainingParticipantsList } from "@/components/learning-development/TrainingParticipantsList";
import { DataTable, FileField, InputField } from "@/components/learning-development/ui/forms";
import { SESSION_SORT_OPTIONS, TITLE_SORT_OPTIONS } from "@/utils/listSort";
import { resolveLearningTrainerUserId } from "@/utils/learning/resolveTrainerUserId";
import {
  createEmptyAssessmentForm,
  createEmptyMaterialForm,
  createEmptySessionForm,
} from "@/utils/learningFormState";
import { participantRowUserId } from "@/utils/learning/participants";
import {
  isMaterialVisibility,
  MATERIAL_VISIBILITY_OPTIONS,
} from "@/utils/learning/materialVisibility";
import { hrmsService } from "@/services/hrms.service";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { formatApiDateDisplay } from "@/utils/apiDate";

const HR_TABS = [
  { id: "overview", label: "Overview" },
  { id: "sessions", label: "Sessions" },
  { id: "trainers", label: "Trainers" },
  { id: "participants", label: "Trainees" },
  { id: "materials", label: "Materials" },
  { id: "assessments", label: "Assessments" },
  { id: "attendance", label: "Attendance" },
  { id: "scores", label: "Scores" },
] as const;

const EMPLOYEE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "materials", label: "Materials" },
  { id: "assessments", label: "Assessments" },
  { id: "scores", label: "Scores" },
] as const;

const ANALYTICS_LABELS: Record<string, string> = {
  training_id: "Training ID",
  enrolled_count: "Enrolled count",
  completed_count: "Completed count",
  average_score_percent: "Average score (%)",
  average_attendance_percent: "Average attendance (%)",
};

export function TrainingDetailPageClient({ trainingId }: { trainingId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "overview";
  const tab =
    rawTab === "analytics"
      ? "overview"
      : rawTab === "marks" || rawTab === "scored"
        ? "scores"
        : rawTab;

  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");
  const tabs = hasHrAccess ? HR_TABS : EMPLOYEE_TABS;
  const safeTab = tabs.some((t) => t.id === tab) ? tab : "overview";

  const qc = useQueryClient();
  const { toast, runAction } = useDashboardAction();
  const tid = trainingId.trim();

  const detailQ = useTrainingDetail(tid, Boolean(tid), { employeeView: !hasHrAccess });
  const sessionsQ = useTrainingSessions(tid, Boolean(tid) && hasHrAccess && safeTab === "sessions");
  const trainersQ = useTrainingTrainers(tid, Boolean(tid) && hasHrAccess && safeTab === "trainers");
  const participantsQ = useTrainingParticipants(
    tid,
    Boolean(tid) && hasHrAccess && safeTab === "participants"
  );
  const materialsQ = useTrainingMaterials(
    tid,
    Boolean(tid) &&
      (safeTab === "materials" || (!hasHrAccess && safeTab === "overview"))
  );
  const assessmentsQ = useTrainingAssessments(
    tid,
    Boolean(tid) && (safeTab === "assessments" || (!hasHrAccess && safeTab === "overview"))
  );
  const analyticsQ = useTrainingAnalytics(tid, Boolean(tid) && hasHrAccess && safeTab === "overview");
  const directoryQ = useLearningTrainerDirectory(
    safeTab === "trainers" || safeTab === "participants"
  );

  const assignedTrainerUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of trainersQ.data ?? []) {
      const u = String(
        r.trainer_user_id ?? r.trainerUserId ?? r.user_id ?? r.userId ?? ""
      ).trim();
      if (u && Number(u) > 0) ids.add(u);
    }
    return ids;
  }, [trainersQ.data]);

  const trainerOptions = useMemo(
    () => (directoryQ.data ?? []).filter((o) => !assignedTrainerUserIds.has(o.id)),
    [directoryQ.data, assignedTrainerUserIds]
  );

  const enrolledUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of participantsQ.data ?? []) {
      const id = participantRowUserId(row);
      if (id) ids.add(id);
    }
    return ids;
  }, [participantsQ.data]);

  const addTraineeOptions = useMemo(
    () => (directoryQ.data ?? []).filter((o) => !enrolledUserIds.has(o.id)),
    [directoryQ.data, enrolledUserIds]
  );

  const training = detailQ.data ?? {};

  const [sessionForm, setSessionForm] = useState(createEmptySessionForm);

  const [trainerPick, setTrainerPick] = useState("");
  const [removingTrainerId, setRemovingTrainerId] = useState<string | null>(null);
  const [participantPick, setParticipantPick] = useState("");
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState(createEmptyMaterialForm);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [assessmentForm, setAssessmentForm] = useState(createEmptyAssessmentForm);
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);

  const sessionMut = useMutation({
    mutationFn: () => {
      if (!sessionForm.mode) throw new Error("Please select mode.");
      return hrmsService.createTrainingSession(tid, {
        ...sessionForm,
        venue: sessionForm.venue.trim() || null,
        meeting_link: sessionForm.meeting_link.trim() || null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "sessions", tid] });
      setSessionForm(createEmptySessionForm());
    },
  });

  const assignTrainer = () =>
    void runAction("Assign trainer", async () => {
      const idNum = await resolveLearningTrainerUserId(trainerPick);
      await hrmsService.assignTrainers(tid, [idNum]);
      setTrainerPick("");
      await qc.invalidateQueries({ queryKey: ["learning", "trainers", tid] });
      await qc.invalidateQueries({ queryKey: ["learning", "training", tid] });
    });

  const removeTrainerById = (trainerUserId: string) =>
    void runAction("Remove trainer", async () => {
      setRemovingTrainerId(trainerUserId);
      try {
        const idNum = await resolveLearningTrainerUserId(trainerUserId);
        await hrmsService.removeTrainer(tid, String(idNum));
        await qc.invalidateQueries({ queryKey: ["learning", "trainers", tid] });
        await qc.invalidateQueries({ queryKey: ["learning", "training", tid] });
      } finally {
        setRemovingTrainerId(null);
      }
    });

  const addParticipantMut = useMutation({
    mutationFn: async () => {
      const idNum = await resolveLearningTrainerUserId(participantPick);
      await hrmsService.addTrainingParticipants(tid, { user_ids: [idNum], select_all: false });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "participants", tid] });
      setParticipantPick("");
    },
  });

  const updateParticipantStatus = (userId: string, status: "COMPLETED" | "WITHDRAWN") =>
    void runAction("Update trainee status", async () => {
      setUpdatingParticipantId(userId);
      try {
        await hrmsService.updateTrainingParticipantStatus(tid, userId, status);
        await qc.invalidateQueries({ queryKey: ["learning", "participants", tid] });
      } finally {
        setUpdatingParticipantId(null);
      }
    });

  const uploadMaterialMut = useMutation({
    mutationFn: async () => {
      if (!materialFile) throw new Error("Choose a PDF.");
      if (!materialForm.visibility) throw new Error("Please select visibility.");
      await hrmsService.uploadTrainingMaterial(tid, {
        title: materialForm.title.trim(),
        visibility: materialForm.visibility,
        materialFile,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "materials", tid] });
      setMaterialForm(createEmptyMaterialForm());
      setMaterialFile(null);
    },
  });

  const uploadAssessmentMut = useMutation({
    mutationFn: async () => {
      if (!assessmentFile) throw new Error("Choose a PDF.");
      await hrmsService.uploadAssessment(tid, {
        name: assessmentForm.name.trim(),
        description: assessmentForm.description.trim() || undefined,
        weight_percent: Number(assessmentForm.weight_percent || "0"),
        assessmentFile,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "assessments", tid] });
      setAssessmentForm(createEmptyAssessmentForm());
      setAssessmentFile(null);
    },
  });

  const title = String(training.name ?? `Training ${tid}`);

  const analyticsCards = useMemo(() => {
    const a = analyticsQ.data ?? {};
    return Object.entries(a).filter(([key]) => key !== "training_id");
  }, [analyticsQ.data]);

  const materialDisplayRows = useMemo(
    () =>
      (materialsQ.data ?? []).map((row) => ({
        ...row,
        visibility: <MaterialVisibilityBadge value={row.visibility} />,
      })),
    [materialsQ.data]
  );

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <nav
            className="flex flex-wrap items-center gap-1.5 text-xs text-wt-text-muted"
            aria-label="Breadcrumb"
          >
            <Link
              href="/dashboard/learning-development"
              className="hover:text-wt-text transition"
            >
              Learning &amp; Development
            </Link>
            <span aria-hidden className="text-wt-text-muted/60">
              /
            </span>
            {hasHrAccess ? (
              <>
                <Link
                  href="/dashboard/learning-development/trainings"
                  className="hover:text-wt-text transition"
                >
                  Trainings
                </Link>
                <span aria-hidden className="text-wt-text-muted/60">
                  /
                </span>
              </>
            ) : null}
            <span className="text-wt-text truncate max-w-[14rem] sm:max-w-xs" title={title}>
              {title}
            </span>
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <TrainingStatusControl
              trainingId={tid}
              currentStatus={String(training.status ?? "DRAFT")}
              canEdit={hasHrAccess}
            />
          </div>
        </div>
        <button type="button" className="btn-ghost px-3 py-2 text-sm border border-wt-border rounded-lg" onClick={() => router.refresh()}>
          Refresh view
        </button>
      </div>

      {detailQ.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {detailQ.error instanceof Error
            ? detailQ.error.message
            : "This training is not available in the open catalog."}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-wt-border pb-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/learning-development/trainings/${encodeURIComponent(tid)}?tab=${t.id}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              safeTab === t.id ? "bg-wt-surface-3 text-wt-text" : "text-wt-text-muted hover:bg-wt-surface-2"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {safeTab === "overview" && !detailQ.isError ? (
        hasHrAccess ? (
          <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
            <h2 className="font-semibold">Training analytics</h2>
            {analyticsQ.isLoading ? (
              <p className="text-sm text-wt-text-muted">Loading analytics…</p>
            ) : analyticsCards.length ? (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {analyticsCards.map(([k, v]) => (
                  <article key={k} className="rounded-xl border border-wt-border bg-wt-surface-2 p-4">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-wt-text-muted">
                      {ANALYTICS_LABELS[k] ?? k.replaceAll("_", " ")}
                    </p>
                    <p className="text-lg font-semibold mt-2 break-all">
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-wt-text-muted">No analytics returned for this training.</p>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
            <h2 className="font-semibold">Training details</h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-wt-text-muted">Category</dt>
                <dd className="font-medium">{String(training.category ?? "—")}</dd>
              </div>
              <div>
                <dt className="text-wt-text-muted">Type</dt>
                <dd className="font-medium">{String(training.type ?? "—")}</dd>
              </div>
              <div>
                <dt className="text-wt-text-muted">Status</dt>
                <dd className="font-medium">{String(training.status ?? "—")}</dd>
              </div>
              <div>
                <dt className="text-wt-text-muted">Dates</dt>
                <dd className="font-medium">
                  {formatApiDateDisplay(String(training.start_date ?? ""))} →{" "}
                  {formatApiDateDisplay(String(training.end_date ?? ""))}
                </dd>
              </div>
            </dl>
            {String(training.description ?? "").trim() ? (
              <p className="text-sm text-wt-text-muted">{String(training.description)}</p>
            ) : null}
          </section>
        )
      ) : null}

      {safeTab === "sessions" ? (
        <div className="space-y-6">
          {hasHrAccess ? (
            <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
              <h2 className="font-semibold">Add session</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <InputField label="Session date" type="date" required value={sessionForm.session_date} onChange={(v) => setSessionForm((p) => ({ ...p, session_date: v }))} />
                <SelectField
                  label="Mode"
                  placeholder="Select mode"
                  required
                  value={sessionForm.mode}
                  options={["ONLINE", "OFFLINE", "HYBRID"]}
                  onChange={(v) => setSessionForm((p) => ({ ...p, mode: v }))}
                />
                <InputField label="Start time" type="time" value={sessionForm.start_time} onChange={(v) => setSessionForm((p) => ({ ...p, start_time: v }))} />
                <InputField label="End time" type="time" value={sessionForm.end_time} onChange={(v) => setSessionForm((p) => ({ ...p, end_time: v }))} />
                <InputField label="Venue" value={sessionForm.venue} onChange={(v) => setSessionForm((p) => ({ ...p, venue: v }))} />
                <InputField label="Meeting link" value={sessionForm.meeting_link} onChange={(v) => setSessionForm((p) => ({ ...p, meeting_link: v }))} />
              </div>
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm"
                disabled={sessionMut.isPending}
                onClick={() => sessionMut.mutate(undefined, { onError: (e) => alert(e instanceof Error ? e.message : "Failed") })}
              >
                Create session
              </button>
            </section>
          ) : (
            <p className="text-sm text-wt-text-muted">Only HR/Admin can create sessions.</p>
          )}
          <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
            <DataTable
              title="Sessions"
              columns={["session_date", "start_time", "end_time", "mode", "venue", "meeting_link"]}
              rows={sessionsQ.data ?? []}
              emptyLabel={sessionsQ.isLoading ? "Loading sessions…" : "No sessions yet."}
              sortOptions={SESSION_SORT_OPTIONS}
            />
          </section>
        </div>
      ) : null}

      {safeTab === "trainers" ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <h2 className="font-semibold">Trainers</h2>
          {hasHrAccess ? (
            <div className="flex flex-wrap items-end gap-3">
              <SelectField
                label="Assign trainer"
                required
                className="min-w-[min(100%,280px)] flex-1 max-w-md"
                value={trainerPick}
                onChange={setTrainerPick}
                placeholder="Select trainer"
                options={trainerOptions.map((o) => ({ value: o.id, label: o.label }))}
              />
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm shrink-0"
                disabled={!trainerPick}
                onClick={assignTrainer}
              >
                Assign
              </button>
            </div>
          ) : null}
          <AssignedTrainersList
            rows={trainersQ.data ?? []}
            loading={trainersQ.isLoading}
            canManage={hasHrAccess}
            removingUserId={removingTrainerId}
            onRemove={hasHrAccess ? removeTrainerById : undefined}
          />
        </section>
      ) : null}

      {safeTab === "participants" ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <h2 className="font-semibold">Trainees</h2>
          {hasHrAccess ? (
            <div className="flex flex-wrap items-end gap-3">
              <SelectField
                label="Add trainee"
                required
                className="min-w-[min(100%,280px)] flex-1 max-w-md"
                value={participantPick}
                onChange={setParticipantPick}
                placeholder="Select trainee"
                options={addTraineeOptions.map((o) => ({ value: o.id, label: o.label }))}
              />
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-40"
                disabled={addParticipantMut.isPending || !participantPick}
                onClick={() =>
                  addParticipantMut.mutate(undefined, {
                    onError: (e) => alert(e instanceof Error ? e.message : "Failed"),
                  })
                }
              >
                {addParticipantMut.isPending ? "Adding…" : "Add trainee"}
              </button>
            </div>
          ) : null}
          <TrainingParticipantsList
            rows={participantsQ.data ?? []}
            loading={participantsQ.isLoading}
            canManage={hasHrAccess}
            updatingUserId={updatingParticipantId}
            onMarkCompleted={
              hasHrAccess ? (userId) => updateParticipantStatus(userId, "COMPLETED") : undefined
            }
            onMarkWithdrawn={
              hasHrAccess ? (userId) => updateParticipantStatus(userId, "WITHDRAWN") : undefined
            }
          />
        </section>
      ) : null}

      {safeTab === "materials" ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <h2 className="font-semibold">Materials</h2>
          {hasHrAccess ? (
            <div className="flex flex-wrap lg:flex-nowrap items-end gap-3">
              <div className="min-w-[140px] flex-1">
                <InputField label="Title" required value={materialForm.title} onChange={(v) => setMaterialForm((p) => ({ ...p, title: v }))} />
              </div>
              <div className="w-full sm:w-44 shrink-0">
                <SelectField
                  label="Visibility"
                  placeholder="Select visibility"
                  required
                  value={materialForm.visibility}
                  options={MATERIAL_VISIBILITY_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  onChange={(v) =>
                    setMaterialForm((p) => ({
                      ...p,
                      visibility: isMaterialVisibility(v) ? v : "",
                    }))
                  }
                />
              </div>
              <div className="min-w-[160px] flex-1">
                <FileField label="PDF" required accept=".pdf,application/pdf" onPick={setMaterialFile} />
              </div>
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm shrink-0"
                disabled={uploadMaterialMut.isPending || !materialFile}
                onClick={() => uploadMaterialMut.mutate(undefined, { onError: (e) => alert(String(e)) })}
              >
                Upload
              </button>
            </div>
          ) : null}
          <DataTable
            title="List of materials"
            columns={["title", "material_url", "visibility"]}
            rows={materialDisplayRows}
            emptyLabel="No materials."
            sortOptions={TITLE_SORT_OPTIONS}
          />
        </section>
      ) : null}

      {safeTab === "assessments" ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <h2 className="font-semibold">Assessments</h2>
          {hasHrAccess ? (
            <div className="space-y-3">
              <div className="flex flex-wrap lg:flex-nowrap items-end gap-3">
                <div className="min-w-[140px] flex-1">
                  <InputField label="Name" required value={assessmentForm.name} onChange={(v) => setAssessmentForm((p) => ({ ...p, name: v }))} />
                </div>
                <div className="w-28 shrink-0">
                  <InputField label="Weight %" value={assessmentForm.weight_percent} onChange={(v) => setAssessmentForm((p) => ({ ...p, weight_percent: v }))} />
                </div>
                <div className="min-w-[160px] flex-1">
                  <FileField label="Assessment PDF" required accept=".pdf,application/pdf" onPick={setAssessmentFile} />
                </div>
                <button
                  type="button"
                  className="btn-primary px-4 py-2 text-sm shrink-0"
                  disabled={uploadAssessmentMut.isPending || !assessmentFile}
                  onClick={() => uploadAssessmentMut.mutate(undefined, { onError: (e) => alert(String(e)) })}
                >
                  Upload
                </button>
              </div>
              <div className="w-full">
                <InputField label="Description" value={assessmentForm.description} onChange={(v) => setAssessmentForm((p) => ({ ...p, description: v }))} />
              </div>
            </div>
          ) : null}
          <DataTable
            title="List of assessments"
            columns={["name", "description", "file_url", "weight_percent"]}
            rows={assessmentsQ.data ?? []}
            emptyLabel="No assessments."
            sortOptions={TITLE_SORT_OPTIONS}
          />
        </section>
      ) : null}

      {safeTab === "attendance" ? <AttendancePageClient fixedTrainingId={tid} /> : null}
      {safeTab === "scores" && hasHrAccess ? <ScoresPageClient fixedTrainingId={tid} /> : null}
      {safeTab === "scores" && !hasHrAccess ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Scores</h2>
            <p className="text-sm text-wt-text-muted mt-1">
              Your published assessment scores for this training.
            </p>
          </div>
          <EmployeeTrainingMyMarks trainingId={tid} enabled={safeTab === "scores"} />
        </section>
      ) : null}
    </div>
    <DashboardToast toast={toast} />
    </>
  );
}
