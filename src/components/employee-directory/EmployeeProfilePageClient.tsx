"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { useEmployeeDirectoryAccess } from "@/hooks/employee-directory/useEmployeeDirectoryAccess";
import {
  useEmployeeProfile,
  useUpdateEmployeeProfile,
} from "@/hooks/employee-directory/useEmployeeProfile";
import { hrmsService } from "@/services/hrms.service";
import { toRows } from "@/utils/apiRows";
import { useEmployeeResumes } from "@/hooks/resumes/useEmployeeResumes";
import {
  cleanEmployeeName,
  editFormToUpdatePayload,
  formatProfileDisplayValue,
  pickEmployeeRole,
  pickProfileField,
  profileToEditForm,
  rowEmail,
  type EmployeeProfileEditForm,
} from "@/utils/employeeDirectory";
import { validatePersonalEmail } from "@/utils/personalEmail";
import {
  buildResumeShareLinkIndex,
  lookupResumeShareLink,
} from "@/utils/employeeResume";
import { canFetchEmployeeResumeApi } from "@/utils/roles";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { InputField, SelectField } from "@/components/dashboard/ui/forms";
import { EmployeeProfileSummaryCard } from "@/components/employee-directory/EmployeeProfileSummaryCard";
import { EmployeeTrainingMarksCard } from "@/components/learning-development/EmployeeTrainingMarksCard";
import { EmployeeLeaveBalancesCard } from "@/components/employee-directory/EmployeeLeaveBalancesCard";
import { FullProfileDetailsGrid } from "@/components/employee-directory/FullProfileDetailsGrid";
import { EmployeeResumeLink } from "@/components/resumes/EmployeeResumeLink";
import { IconPencil } from "@/components/employee-directory/employeeDirectoryIcons";
const WORK_MODES = ["ONSITE", "OFFSHORE", "HYBRID", "REMOTE"];
const WORK_LOCATIONS = ["ONSITE", "OFFSHORE", "HYBRID", "REMOTE"];
const USER_STATUSES = ["ACTIVE", "INACTIVE", "PENDING", "ONBOARDING"];

export function EmployeeProfilePageClient() {
  const params = useParams();
  const empId = decodeURIComponent(String(params?.empId ?? "").trim());
  const {
    authStatus,
    canView: canViewProfile,
    canEdit: canEditProfile,
    queriesEnabled,
    roles,
  } = useEmployeeDirectoryAccess();
  const { toast, actionLoading, runAction } = useDashboardAction();
  const { data: profile, isLoading, isError, error, refetch } = useEmployeeProfile(empId, {
    enabled: queriesEnabled,
  });
  const { data: resumePayload } = useEmployeeResumes({
    enabled: queriesEnabled && canFetchEmployeeResumeApi(roles),
  });
  const updateMutation = useUpdateEmployeeProfile(empId);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EmployeeProfileEditForm | null>(null);
  const [bandOptions, setBandOptions] = useState<string[]>([]);

  const profileRecord = profile ?? {};
  const displayName = cleanEmployeeName(profileRecord) || "Employee";
  const department = String(pickProfileField(profileRecord, ["department"]) ?? "").trim();
  const email = String(pickProfileField(profileRecord, ["email"]) ?? "").trim();
  const profileUserId = String(
    profileRecord.user_id ?? profileRecord.userId ?? ""
  ).trim();
  const employeeRole = pickEmployeeRole(profileRecord);

  const resumeShareHref = useMemo(() => {
    const index = buildResumeShareLinkIndex(resumePayload?.rows ?? []);
    return lookupResumeShareLink(index, {
      empId,
      userId: String(profileRecord.user_id ?? profileRecord.userId ?? "").trim(),
      email: rowEmail(profileRecord),
    });
  }, [resumePayload, empId, profileRecord]);
  const empIdDisplay = formatProfileDisplayValue(
    pickProfileField(profileRecord, ["emp_id", "empId"])
  );

  useEffect(() => {
    if (!isEditing || !canEditProfile) return;
    let cancelled = false;
    void (async () => {
      try {
        const bandsRes = await hrmsService.getBands();
        if (cancelled) return;
        const rows = toRows((bandsRes as { data?: unknown }).data ?? bandsRes);
        const labels = rows
          .map((row) => {
            const id = String(row.id ?? row.band_id ?? row.bandId ?? "").trim();
            const name = String(row.name ?? row.band_name ?? row.bandName ?? id).trim();
            return id ? `${name} (${id})` : name;
          })
          .filter(Boolean);
        setBandOptions([...new Set(["", ...labels])]);
      } catch {
        if (!cancelled) setBandOptions([""]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, canEditProfile]);

  const bandSelectOptions = useMemo(() => {
    const fallback = editForm?.band_id?.trim() ? ["", editForm.band_id] : [""];
    const source = bandOptions.length ? bandOptions : fallback;
    return [...new Set(source)];
  }, [bandOptions, editForm?.band_id]);

  const openEditor = () => {
    setEditForm(profileToEditForm(profileRecord));
    setIsEditing(true);
  };

  const cancelEditor = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const saveProfile = () => {
    if (!editForm || !empId) return;
    void runAction("Update employee profile", async () => {
      const workEmail = email || String(pickProfileField(profileRecord, ["email"]) ?? "").trim();
      const personal = editForm.personal_email.trim();
      if (personal) {
        const personalError = validatePersonalEmail(workEmail, personal, { required: true });
        if (personalError) throw new Error(personalError);
      }
      await updateMutation.mutateAsync(editFormToUpdatePayload(editForm));
      await refetch();
      setIsEditing(false);
      setEditForm(null);
    });
  };

  if (authStatus === "loading") {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted shadow-sm">
          Loading…
        </div>
      </DashboardPageShell>
    );
  }

  if (!canViewProfile) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 shadow-sm">
          <h3 className="text-lg font-semibold">Access restricted</h3>
          <p className="mt-2 text-sm text-wt-text-muted">
            Employee profiles in the directory are available to HR and admin users only.
          </p>
          <Link href={DASHBOARD_ROUTES.overview} className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Back to overview
          </Link>
        </div>
      </DashboardPageShell>
    );
  }

  if (!empId) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted shadow-sm">
          Invalid employee ID.
          <Link href={DASHBOARD_ROUTES["employee-directory"]} className="ml-2 text-blue-600 hover:underline">
            Back to directory
          </Link>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <DashboardToast toast={toast} />

      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="p-5 md:p-7 lg:p-8">
          <Link
            href={DASHBOARD_ROUTES["employee-directory"]}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to directory
          </Link>
          {isLoading ? (
            <p className="mt-8 text-sm text-wt-text-muted">Loading employee profile…</p>
          ) : null}

          {isError ? (
            <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p>Could not load profile.{error instanceof Error ? ` ${error.message}` : ""}</p>
              <button type="button" className="btn-ghost mt-3 px-3 py-1.5 text-xs" onClick={() => void refetch()}>
                Retry
              </button>
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <>
              <div className="mt-6 flex flex-col gap-4 border-b border-wt-border pb-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold tracking-tight text-wt-text">
                      {displayName}
                      {employeeRole ? (
                        <span className="font-semibold text-wt-text-muted"> | {employeeRole}</span>
                      ) : null}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-wt-text-muted">
                    Employee ID: {empIdDisplay}
                    {email ? (
                      <>
                        <span className="mx-2 text-wt-border-md" aria-hidden>
                          •
                        </span>
                        <span className="text-blue-600">{email}</span>
                      </>
                    ) : null}
                    <span className="mx-2 text-wt-border-md" aria-hidden>
                      •
                    </span>
                    <span className="text-wt-text-muted">Resume: </span>
                    <EmployeeResumeLink href={resumeShareHref} />
                  </p>
                </div>

                {canEditProfile && !isEditing ? (
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-600 bg-white px-4 py-2.5 text-sm font-medium text-blue-600 shadow-sm transition hover:bg-blue-50"
                    onClick={openEditor}
                  >
                    <IconPencil />
                    Edit Profile
                  </button>
                ) : null}
              </div>

              {isEditing && editForm ? (
                <div className="mt-6 space-y-4 rounded-xl border border-wt-border bg-wt-surface-2/60 p-5 md:p-6">
                  <h4 className="text-base font-semibold">Edit profile</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField label="Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
                    <label className="flex flex-col gap-1 text-xs text-wt-text-muted">
                      Work email
                      <input
                        className="input-field bg-wt-surface-2 px-3 py-2 text-sm text-wt-text-muted"
                        type="email"
                        value={email}
                        readOnly
                        disabled
                      />
                    </label>
                    <InputField
                      label="Personal mail ID"
                      type="email"
                      value={editForm.personal_email}
                      onChange={(v) => setEditForm({ ...editForm, personal_email: v })}
                    />
                    <InputField
                      label="Department"
                      value={editForm.department}
                      onChange={(v) => setEditForm({ ...editForm, department: v })}
                    />
                    <SelectField
                      label="Status"
                      value={editForm.user_status}
                      options={USER_STATUSES}
                      onChange={(v) => setEditForm({ ...editForm, user_status: v })}
                    />
                    <SelectField
                      label="Work mode"
                      value={editForm.work_mode}
                      options={WORK_MODES}
                      onChange={(v) => setEditForm({ ...editForm, work_mode: v })}
                    />
                    <SelectField
                      label="Work location"
                      value={editForm.work_location_type}
                      options={WORK_LOCATIONS}
                      onChange={(v) => setEditForm({ ...editForm, work_location_type: v })}
                    />
                    <SelectField
                      label="Band"
                      value={editForm.band_id}
                      placeholder="Select band"
                      options={bandSelectOptions.map((opt) => ({
                        value: opt,
                        label: opt || "Select band",
                      }))}
                      onChange={(raw) => {
                        const id = raw.match(/\(([^)]+)\)\s*$/)?.[1]?.trim() ?? raw;
                        setEditForm({ ...editForm, band_id: id });
                      }}
                    />
                    <InputField
                      label="Primary skills (comma-separated)"
                      value={editForm.primary_skills}
                      onChange={(v) => setEditForm({ ...editForm, primary_skills: v })}
                    />
                    <InputField
                      label="Secondary skill"
                      value={editForm.secondary_skill}
                      onChange={(v) => setEditForm({ ...editForm, secondary_skill: v })}
                    />
                    <InputField
                      label="Secondary skill rating (1–5)"
                      value={editForm.secondary_rating}
                      onChange={(v) => setEditForm({ ...editForm, secondary_rating: v })}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={actionLoading || updateMutation.isPending}
                      onClick={saveProfile}
                    >
                      Save changes
                    </button>
                    <button type="button" className="btn-ghost" disabled={actionLoading} onClick={cancelEditor}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 space-y-6">
                <EmployeeLeaveBalancesCard empId={empId} enabled={queriesEnabled} />
                <EmployeeTrainingMarksCard
                  variant="hr"
                  targetUserId={profileUserId}
                  targetEmail={email}
                  enabled={queriesEnabled && Boolean(profileUserId)}
                />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 rounded-xl border border-wt-border p-5 md:p-6">
                  <FullProfileDetailsGrid
                    profile={profileRecord}
                    resumeShareHref={resumeShareHref}
                  />
                </div>

                <EmployeeProfileSummaryCard
                  profile={profileRecord}
                  displayName={displayName}
                  designation={employeeRole}
                  department=""
                  email={email}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}
