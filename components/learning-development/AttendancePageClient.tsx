"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTrainingSessions } from "@/components/learning-development/hooks/useLearningTrainings";
import { TrainingScopePicker } from "@/components/learning-development/TrainingScopePicker";
import { DataTable, SelectField } from "@/components/learning-development/ui/forms";
import { participantRowUserId } from "@/src/lib/learning/participants";
import { resolveLearningTrainerUserId } from "@/src/lib/learning/resolveTrainerUserId";
import { toPagedRows } from "@/src/lib/apiRows";
import { hrmsService } from "@/src/services/hrms.service";

export function AttendancePageClient() {
  const [trainingId, setTrainingId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [status, setStatus] = useState("PRESENT");

  const sessionsQ = useTrainingSessions(trainingId, Boolean(trainingId.trim()));

  const participantsQ = useQuery({
    queryKey: ["learning", "participants", trainingId],
    enabled: Boolean(trainingId.trim()),
    queryFn: async () => {
      const res = await hrmsService.getTrainingParticipants(trainingId);
      return toPagedRows(res.data ?? res);
    },
  });

  const attendanceQ = useQuery({
    queryKey: ["learning", "attendance", trainingId, sessionId],
    enabled: Boolean(trainingId.trim() && sessionId.trim()),
    queryFn: async () => {
      const res = await hrmsService.getAttendance(trainingId, sessionId);
      return toPagedRows(res.data ?? res);
    },
  });

  const qc = useQueryClient();

  const participantOptions = useMemo(() => {
    const rows = participantsQ.data ?? [];
    const options: Array<{ id: string; label: string }> = [];
    for (const row of rows) {
      const id = participantRowUserId(row);
      if (!id) continue;
      const name = String(row.name ?? row.employee_name ?? id).trim();
      options.push({ id, label: `${name} (${id})` });
    }
    return options;
  }, [participantsQ.data]);

  const markMut = useMutation({
    mutationFn: async () => {
      const uid = await resolveLearningTrainerUserId(participantId);
      await hrmsService.markAttendance(trainingId, sessionId, {
        user_id: uid,
        attendance_status: status as "PRESENT" | "ABSENT",
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["learning", "attendance", trainingId, sessionId] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-wt-text-muted mt-1">Load attendance by session and mark participant status.</p>
      </div>

      <TrainingScopePicker trainingId={trainingId} onTrainingIdChange={(id) => { setTrainingId(id); setSessionId(""); }} />

      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
          Session
          <select className="input-field px-3 py-2 text-sm" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">Select session</option>
            {(sessionsQ.data ?? []).map((s) => {
              const sid = String(s.id ?? "").trim();
              const d = String(s.session_date ?? "").trim();
              return (
                <option key={sid} value={sid}>
                  {[d, sid].filter(Boolean).join(" · ") || sid}
                </option>
              );
            })}
          </select>
        </label>
        <button
          type="button"
          className="btn-ghost px-3 py-2 text-sm border border-wt-border rounded-lg self-end"
          disabled={!trainingId || !sessionId}
          onClick={() => qc.invalidateQueries({ queryKey: ["learning", "attendance", trainingId, sessionId] })}
        >
          Reload attendance
        </button>
      </div>

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
        <h2 className="font-semibold">Mark attendance</h2>
        <p className="text-xs text-wt-text-muted">
          API supports Present / Absent. Use “Late” operationally as Present with a note in your process if needed.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="text-xs text-wt-text-muted flex flex-col gap-1">
            Participant
            <select className="input-field px-3 py-2 text-sm" value={participantId} onChange={(e) => setParticipantId(e.target.value)}>
              <option value="">Select</option>
              {participantOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <SelectField label="Status" value={status} options={["PRESENT", "ABSENT"]} onChange={setStatus} />
          <div className="flex items-end">
            <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={markMut.isPending || !trainingId || !sessionId || !participantId} onClick={() => markMut.mutate(undefined, { onError: (e) => alert(String(e)) })}>
              Save
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
        <DataTable
          title="Attendance rows"
          columns={["id", "training_session_id", "training_id", "user_id", "attendance_status"]}
          rows={attendanceQ.data ?? []}
          emptyLabel={attendanceQ.isLoading ? "Loading…" : "Select training and session, then load."}
        />
      </section>
    </div>
  );
}
