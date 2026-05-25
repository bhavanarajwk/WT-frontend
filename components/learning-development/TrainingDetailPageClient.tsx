"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  useTrainingAnalytics,
  useTrainingAssessments,
  useTrainingDetail,
  useTrainingMaterials,
  useTrainingParticipants,
  useTrainingSessions,
  useTrainingTrainers,
} from "@/components/learning-development/hooks/useLearningTrainings";
import { useLearningTrainerDirectory } from "@/components/learning-development/hooks/useLearningTrainerDirectory";
import { AttendancePageClient } from "@/components/learning-development/AttendancePageClient";
import { ScoresPageClient } from "@/components/learning-development/ScoresPageClient";
import { TrainingStatusControl } from "@/components/learning-development/TrainingStatusControl";
import { DataTable, FileField, InputField, SelectField } from "@/components/learning-development/ui/forms";
import { resolveLearningTrainerUserId } from "@/src/lib/learning/resolveTrainerUserId";
import { participantRowUserId } from "@/src/lib/learning/participants";
import { hrmsService } from "@/src/services/hrms.service";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "sessions", label: "Sessions" },
  { id: "trainers", label: "Trainers" },
  { id: "participants", label: "Trainees" },
  { id: "materials", label: "Materials" },
  { id: "assessments", label: "Assessments" },
  { id: "attendance", label: "Attendance" },
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
  const tab = rawTab === "analytics" ? "overview" : rawTab;
  const safeTab = TABS.some((t) => t.id === tab) ? tab : "overview";

  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const hasHrAccess = roles.includes("ROLE_HR") || roles.includes("ROLE_ADMIN");

  const qc = useQueryClient();
  const tid = trainingId.trim();

  const detailQ = useTrainingDetail(tid, Boolean(tid));
  const sessionsQ = useTrainingSessions(tid, Boolean(tid) && safeTab === "sessions");
  const trainersQ = useTrainingTrainers(tid, Boolean(tid) && safeTab === "trainers");
  const participantsQ = useTrainingParticipants(tid, Boolean(tid) && safeTab === "participants");
  const materialsQ = useTrainingMaterials(tid, Boolean(tid) && safeTab === "materials");
  const assessmentsQ = useTrainingAssessments(tid, Boolean(tid) && safeTab === "assessments");
  const analyticsQ = useTrainingAnalytics(tid, Boolean(tid) && safeTab === "overview");
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

  const [sessionForm, setSessionForm] = useState({
    session_date: "",
    start_time: "",
    end_time: "",
    mode: "ONLINE",
    venue: "",
    meeting_link: "",
  });

  const [trainerPick, setTrainerPick] = useState("");
  const [participantPick, setParticipantPick] = useState("");
  const [materialForm, setMaterialForm] = useState<{ title: string; visibility: "EMPLOYEE" | "HR_ONLY" }>({
    title: "",
    visibility: "EMPLOYEE",
  });
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [assessmentForm, setAssessmentForm] = useState({ name: "", description: "", weight_percent: "10" });
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);

  const sessionMut = useMutation({
    mutationFn: () =>
      hrmsService.createTrainingSession(tid, {
        ...sessionForm,
        venue: sessionForm.venue.trim() || null,
        meeting_link: sessionForm.meeting_link.trim() || null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "sessions", tid] });
      setSessionForm({
        session_date: "",
        start_time: "",
        end_time: "",
        mode: "ONLINE",
        venue: "",
        meeting_link: "",
      });
    },
  });

  const assignTrainerMut = useMutation({
    mutationFn: async () => {
      const idNum = await resolveLearningTrainerUserId(trainerPick);
      await hrmsService.assignTrainers(tid, [idNum]);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "trainers", tid] });
      await qc.invalidateQueries({ queryKey: ["learning", "training", tid] });
    },
  });

  const removeTrainerMut = useMutation({
    mutationFn: async () => {
      const idNum = await resolveLearningTrainerUserId(trainerPick);
      await hrmsService.removeTrainer(tid, String(idNum));
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "trainers", tid] });
      await qc.invalidateQueries({ queryKey: ["learning", "training", tid] });
    },
  });

  const addParticipantMut = useMutation({
    mutationFn: async () => {
      const idNum = await resolveLearningTrainerUserId(participantPick);
      await hrmsService.addTrainingParticipants(tid, { user_ids: [idNum], select_all: false });
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["learning", "participants", tid] }),
  });

  const uploadMaterialMut = useMutation({
    mutationFn: async () => {
      if (!materialFile) throw new Error("Choose a PDF.");
      await hrmsService.uploadTrainingMaterial(tid, {
        title: materialForm.title.trim(),
        visibility: materialForm.visibility,
        materialFile,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "materials", tid] });
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
      setAssessmentFile(null);
    },
  });

  const title = String(training.name ?? `Training ${tid}`);

  const analyticsCards = useMemo(() => {
    const a = analyticsQ.data ?? {};
    return Object.entries(a).slice(0, 8);
  }, [analyticsQ.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/learning-development" className="text-xs font-medium text-indigo-600 hover:underline">
            ← Dashboard
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <TrainingStatusControl
              trainingId={tid}
              currentStatus={String(training.status ?? "DRAFT")}
              canEdit={hasHrAccess}
            />
          </div>
          <p className="text-sm text-wt-text-muted mt-1">
            Manage this training — sessions, people, attendance, scores, and analytics.
          </p>
        </div>
        <button type="button" className="btn-ghost px-3 py-2 text-sm border border-wt-border rounded-lg" onClick={() => router.refresh()}>
          Refresh view
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-wt-border pb-2">
        {TABS.map((t) => (
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

      {safeTab === "overview" ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-3">
          <h2 className="font-semibold">Training analytics</h2>
          {analyticsQ.isLoading ? (
            <p className="text-sm text-wt-text-muted">Loading analytics…</p>
          ) : analyticsCards.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      ) : null}

      {safeTab === "sessions" ? (
        <div className="space-y-6">
          {hasHrAccess ? (
            <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
              <h2 className="font-semibold">Add session</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <InputField label="Session date" type="date" value={sessionForm.session_date} onChange={(v) => setSessionForm((p) => ({ ...p, session_date: v }))} />
                <SelectField label="Mode" value={sessionForm.mode} options={["ONLINE", "OFFLINE", "HYBRID"]} onChange={(v) => setSessionForm((p) => ({ ...p, mode: v }))} />
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
            />
          </section>
        </div>
      ) : null}

      {safeTab === "trainers" ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <h2 className="font-semibold">Trainers</h2>
          {hasHrAccess ? (
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                Trainer
                <select className="input-field px-3 py-2 text-sm" value={trainerPick} onChange={(e) => setTrainerPick(e.target.value)}>
                  <option value="">Select trainer</option>
                  {trainerOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary px-3 py-2 text-sm" disabled={assignTrainerMut.isPending || !trainerPick} onClick={() => assignTrainerMut.mutate()}>
                  Assign
                </button>
                <button type="button" className="btn-ghost px-3 py-2 text-sm border border-wt-border rounded-lg" disabled={removeTrainerMut.isPending || !trainerPick} onClick={() => removeTrainerMut.mutate()}>
                  Remove
                </button>
              </div>
            </div>
          ) : null}
          <DataTable columns={["name", "email"]} rows={trainersQ.data ?? []} emptyLabel="No trainers assigned." />
        </section>
      ) : null}

      {safeTab === "participants" ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <h2 className="font-semibold">Trainees</h2>
          {hasHrAccess ? (
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <label className="text-xs text-wt-text-muted flex flex-col gap-1">
                Add trainee
                <select className="input-field px-3 py-2 text-sm" value={participantPick} onChange={(e) => setParticipantPick(e.target.value)}>
                  <option value="">Select trainee</option>
                  {addTraineeOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn-primary px-3 py-2 text-sm sm:mb-0 disabled:opacity-40" disabled={addParticipantMut.isPending || !participantPick} onClick={() => addParticipantMut.mutate()}>
                Add trainee
              </button>
            </div>
          ) : null}
          <DataTable
            columns={["name", "email", "enrollment_status"]}
            rows={participantsQ.data ?? []}
            emptyLabel="No trainees enrolled."
          />
        </section>
      ) : null}

      {safeTab === "materials" ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <h2 className="font-semibold">Materials</h2>
          {hasHrAccess ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <InputField label="Title" value={materialForm.title} onChange={(v) => setMaterialForm((p) => ({ ...p, title: v }))} />
              <SelectField label="Visibility" value={materialForm.visibility} options={["EMPLOYEE", "HR_ONLY"]} onChange={(v) => setMaterialForm((p) => ({ ...p, visibility: v as "EMPLOYEE" | "HR_ONLY" }))} />
              <FileField label="PDF" accept=".pdf,application/pdf" onPick={setMaterialFile} />
              <div className="flex items-end">
                <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={uploadMaterialMut.isPending || !materialFile} onClick={() => uploadMaterialMut.mutate(undefined, { onError: (e) => alert(String(e)) })}>
                  Upload
                </button>
              </div>
            </div>
          ) : null}
          <DataTable columns={["title", "material_url", "visibility"]} rows={materialsQ.data ?? []} emptyLabel="No materials." />
        </section>
      ) : null}

      {safeTab === "assessments" ? (
        <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
          <h2 className="font-semibold">Assessments</h2>
          {hasHrAccess ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <InputField label="Name" value={assessmentForm.name} onChange={(v) => setAssessmentForm((p) => ({ ...p, name: v }))} />
              <InputField label="Weight %" value={assessmentForm.weight_percent} onChange={(v) => setAssessmentForm((p) => ({ ...p, weight_percent: v }))} />
              <div className="sm:col-span-2">
                <InputField label="Description" value={assessmentForm.description} onChange={(v) => setAssessmentForm((p) => ({ ...p, description: v }))} />
              </div>
              <FileField label="Assessment PDF" accept=".pdf,application/pdf" onPick={setAssessmentFile} />
              <div className="flex items-end">
                <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={uploadAssessmentMut.isPending || !assessmentFile} onClick={() => uploadAssessmentMut.mutate(undefined, { onError: (e) => alert(String(e)) })}>
                  Upload
                </button>
              </div>
            </div>
          ) : null}
          <DataTable columns={["name", "description", "file_url", "weight_percent"]} rows={assessmentsQ.data ?? []} emptyLabel="No assessments." />
        </section>
      ) : null}

      {safeTab === "attendance" ? <AttendancePageClient fixedTrainingId={tid} /> : null}
      {safeTab === "scores" ? <ScoresPageClient fixedTrainingId={tid} /> : null}
    </div>
  );
}
