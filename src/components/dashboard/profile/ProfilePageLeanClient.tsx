"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hrmsService } from "@/services/hrms.service";
import { ApiError } from "@/api/error";
import { toPagedRows } from "@/utils/apiRows";
import { formatActionErrorMessage, formatActionSuccessMessage } from "@/utils/actionToast";
import { MAX_ONBOARD_FILE_BYTES, MAX_ONBOARD_TOTAL_BYTES } from "@/constants/dashboard";
import { createEmptySelfProfileForm } from "@/utils/profileFormState";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { SelfOnboardingPanel } from "@/components/employee-onboarding/SelfOnboardingPanel";
import { InputField, SelectField, FileField } from "@/components/dashboard/ui/forms";
import {
  ProfilePhotoAvatar,
  ProfileField,
  formatSecondarySkillsForProfile,
  readProfileField,
} from "@/components/dashboard/ui/profile";
import { DataTable } from "@/components/dashboard/ui/DataTable";
import { formatApiDateDisplay } from "@/utils/apiDate";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { EmployeeTrainingMarksCard } from "@/components/learning-development/EmployeeTrainingMarksCard";
import { fetchSelfProfile, shouldSkipSelfProfileFetch } from "@/utils/selfProfile";
import {
  isActiveUserStatus,
  isOffboardedUserStatus,
  resolveProfileStatus,
} from "@/utils/userStatus";
import {
  mergeProjectAndAllocationData,
  normalizeAssignedProjects,
} from "@/utils/dashboard/projects";
import { formatAllocatedHoursPercentLabel } from "@/utils/dashboard/validation";
import { OffboardedBanner } from "@/components/dashboard/shared/OffboardedBanner";
import { OnboardingPendingBanner } from "@/components/dashboard/shared/OnboardingPendingBanner";

export function ProfilePageLeanClient() {
  const { user, refresh: refreshSession } = useAuth();
  const router = useRouter();
  const userRoles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = userRoles.includes("ROLE_MANAGER");
  const isEmployee = userRoles.includes("ROLE_EMPLOYEE");
  const restrictForPendingOnboarding = isEmployee && !hasHrAccess && !hasManagerAccess;
  const employeeSelfServeProfile = isEmployee && !hasHrAccess;

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [employeeProfile, setEmployeeProfile] = useState<Record<string, unknown> | null>(null);
  const [isSelfOnboarded, setIsSelfOnboarded] = useState<boolean>(() =>
    isActiveUserStatus(user?.status)
  );
  const [isOffboarded, setIsOffboarded] = useState<boolean>(() =>
    isOffboardedUserStatus(user?.status)
  );
  const requiresSelfOnboarding =
    restrictForPendingOnboarding && !isSelfOnboarded && !isOffboarded;

  const [profileAssignedProjects, setProfileAssignedProjects] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [profileAssignedProjectsLoading, setProfileAssignedProjectsLoading] = useState(false);

  const [selfProfileForm, setSelfProfileForm] = useState(createEmptySelfProfileForm);
  const [selfProfileEmploymentFiles, setSelfProfileEmploymentFiles] = useState<{
    reliving_letter: File | null;
    salary_slips: File | null;
  }>({
    reliving_letter: null,
    salary_slips: null,
  });
  const [selfProfilePic, setSelfProfilePic] = useState<File | null>(null);
  const [isEditingOwnProfile, setIsEditingOwnProfile] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const loadMyProfile = useCallback(async () => {
    setIsProfileLoading(true);
    try {
      const profile = await fetchSelfProfile(userRoles);
      setEmployeeProfile(profile);
      const status = resolveProfileStatus(profile, user);
      setIsSelfOnboarded(isActiveUserStatus(status));
      setIsOffboarded(isOffboardedUserStatus(status));
    } finally {
      setIsProfileLoading(false);
    }
  }, [user, userRoles]);

  useEffect(() => {
    if (!user) return;
    if (shouldSkipSelfProfileFetch(userRoles)) {
      router.replace(DASHBOARD_ROUTES["leave-team"]);
      return;
    }
    const id = window.setTimeout(() => {
      void loadMyProfile();
    }, 0);
    return () => window.clearTimeout(id);
  }, [user, userRoles, loadMyProfile, router]);

  useEffect(() => {
    if (!user || requiresSelfOnboarding) return;
    const load = async () => {
      setProfileAssignedProjectsLoading(true);
      try {
        const [assignedRes, myAllocationsRes] = await Promise.all([
          hrmsService.getAssignedProjects(),
          hrmsService.getMyAllocations(),
        ]);
        const normalizedProjects = normalizeAssignedProjects(toPagedRows(assignedRes.data ?? assignedRes));
        const myAllocations = toPagedRows(myAllocationsRes.data ?? myAllocationsRes);
        setProfileAssignedProjects(mergeProjectAndAllocationData(normalizedProjects, myAllocations));
      } catch {
        setProfileAssignedProjects([]);
      } finally {
        setProfileAssignedProjectsLoading(false);
      }
    };
    void load();
  }, [user, requiresSelfOnboarding]);

  const profileAssignedProjectsForTable = useMemo(
    () =>
      profileAssignedProjects.map((row) => ({
        ...row,
        allocated_hours: formatAllocatedHoursPercentLabel(
          row.allocated_hours ?? row.allocatedHours ?? row.hours
        ),
      })),
    [profileAssignedProjects]
  );

  const priorEmploymentDocsForProfile = useMemo(() => {
    const raw = String(selfProfileForm.yoe ?? "").trim().replace(",", ".");
    if (!raw) return false;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0;
  }, [selfProfileForm.yoe]);

  async function runAction(label: string, fn: () => Promise<void>) {
    setActionLoading(true);
    try {
      await fn();
      setToast({ type: "success", message: formatActionSuccessMessage(label) });
    } catch (error) {
      const backendMessage =
        error instanceof ApiError ? error.message : error instanceof Error ? error.message : "";
      setToast({ type: "error", message: formatActionErrorMessage(label, backendMessage) });
    } finally {
      setActionLoading(false);
    }
  }

  const handleOnboardingSuccess = useCallback(async () => {
    await refreshSession();
    await loadMyProfile();
    router.replace("/dashboard/overview", { scroll: false });
  }, [refreshSession, loadMyProfile, router]);

  const openOwnProfileEditor = () => {
    const profile = employeeProfile ?? {};
    const primarySkillsRaw = profile.primary_skills ?? profile.primarySkills ?? [];
    const primarySkills = Array.isArray(primarySkillsRaw)
      ? primarySkillsRaw.map((item) => String(item).trim()).filter(Boolean).join(", ")
      : String(primarySkillsRaw ?? "").trim();
    const secondarySkillsRaw =
      (profile.secondary_skills as Array<Record<string, unknown>> | undefined) ??
      (profile.secondarySkills as Array<Record<string, unknown>> | undefined) ??
      [];
    const firstSecondary = Array.isArray(secondarySkillsRaw) ? secondarySkillsRaw[0] : undefined;

    setSelfProfileForm({
      phone_number: String(profile.phone_number ?? profile.phoneNumber ?? "").trim(),
      primary_skills: primarySkills,
      secondary_skill: String(firstSecondary?.skill ?? "").trim(),
      secondary_rating: String(firstSecondary?.rating ?? "").trim(),
      yoe: String(profile.yoe ?? "").trim(),
    });
    setSelfProfileEmploymentFiles({ reliving_letter: null, salary_slips: null });
    setSelfProfilePic(null);
    setIsEditingOwnProfile(true);
  };

  const profileCategory =
    readProfileField(employeeProfile, "category") ||
    readProfileField(employeeProfile, "delivery_status", "deliveryStatus");

  const renderProfileDetails = (extraFields?: React.ReactNode) => (
    <div className="space-y-7">
      <div>
        <h4 className="mb-3 text-sm font-semibold text-wt-text">Personal &amp; Employment Information</h4>
        <div className="space-y-7 rounded-xl border border-wt-border bg-wt-surface-2/50 p-4">
          <section>
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-wt-text-muted">Basic Information</h5>
            <dl className="space-y-3 text-sm">
              <ProfileField label="Name" value={employeeProfile?.name ?? user?.name} />
              <ProfileField label="Status" value={employeeProfile?.status ?? user?.status} />
              <ProfileField label="User Type" value={readProfileField(employeeProfile, "user_type", "userType") ?? user?.user_type} />
              <ProfileField label="Department" value={readProfileField(employeeProfile, "department")} />
              <ProfileField label="Designation" value={readProfileField(employeeProfile, "role")} />
              <ProfileField label="Band" value={readProfileField(employeeProfile, "band_name", "bandName")} />
              <ProfileField label="Category" value={profileCategory} />
              {extraFields}
            </dl>
          </section>
          <section>
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-wt-text-muted">Contact Information</h5>
            <dl className="space-y-3 text-sm">
              <ProfileField label="Work Email" value={employeeProfile?.email ?? user?.email} />
              <ProfileField label="Personal Email" value={readProfileField(employeeProfile, "personal_email", "personalEmail")} />
              <ProfileField label="Phone Number" value={readProfileField(employeeProfile, "phone_number", "phoneNumber")} />
            </dl>
          </section>
          <section>
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-wt-text-muted">Work Information</h5>
            <dl className="space-y-3 text-sm">
              <ProfileField label="Work Mode" value={readProfileField(employeeProfile, "work_mode", "workMode")} />
              <ProfileField label="Work Location" value={readProfileField(employeeProfile, "work_location_type", "workLocationType")} />
              <ProfileField label="Date of Joining" value={formatApiDateDisplay(readProfileField(employeeProfile, "doj"))} />
            </dl>
          </section>
          <section>
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-wt-text-muted">Personal Information</h5>
            <dl className="space-y-3 text-sm">
              <ProfileField label="Date of Birth" value={formatApiDateDisplay(readProfileField(employeeProfile, "date_of_birth", "dateOfBirth"))} />
              <ProfileField label="Gender" value={readProfileField(employeeProfile, "gender")} />
              <ProfileField label="Marital Status" value={readProfileField(employeeProfile, "marital_status", "maritalStatus")} />
              <ProfileField label="Blood Group" value={readProfileField(employeeProfile, "blood_group", "bloodGroup")} />
            </dl>
          </section>
          <section>
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-wt-text-muted">Emergency Contact Information</h5>
            <dl className="space-y-3 text-sm">
              <ProfileField label="Emergency Contact" value={readProfileField(employeeProfile, "emergency_contact_name", "emergencyContactName")} />
              <ProfileField label="Emergency Number" value={readProfileField(employeeProfile, "emergency_contact_number", "emergencyContactNumber")} />
            </dl>
          </section>
          <section>
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-wt-text-muted">Address Information</h5>
            <dl className="space-y-3 text-sm">
              <ProfileField label="Local Address" value={readProfileField(employeeProfile, "local_address", "localAddress")} fullWidth />
              <ProfileField label="Permanent Address" value={readProfileField(employeeProfile, "permanent_address", "permanentAddress")} fullWidth />
            </dl>
          </section>
          <section>
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-wt-text-muted">Skills &amp; Experience</h5>
            <dl className="space-y-3 text-sm">
              <ProfileField
                label="Primary Skills"
                value={
                  Array.isArray(employeeProfile?.primary_skills)
                    ? (employeeProfile?.primary_skills as Array<unknown>).map((s) => String(s)).join(", ")
                    : employeeProfile?.primary_skills
                }
              />
              <ProfileField label="Secondary Skills" value={formatSecondarySkillsForProfile(employeeProfile)} />
              <ProfileField label="Years of Experience" value={employeeProfile?.yoe} />
              <ProfileField label="Webknot Experience" value={readProfileField(employeeProfile, "webknot_experience", "webknotExperience")} />
              <ProfileField label="Total Experience" value={readProfileField(employeeProfile, "total_experience", "totalExperience")} />
            </dl>
          </section>
          <section>
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-wt-text-muted">Documents</h5>
            <dl className="space-y-3 text-sm">
              <ProfileField label="Resume Link" value={readProfileField(employeeProfile, "resume_share_link", "resumeShareLink")} fullWidth link />
            </dl>
          </section>
        </div>
      </div>
    </div>
  );

  const renderAssignedProjects = () => {
    const columns = employeeSelfServeProfile
      ? ["project_name", "project_code", "role", "allocated_hours", "start_date"]
      : ["project_name", "project_code", "role", "allocated_hours", "billing_status", "start_date", "end_date"];
    return (
      <div className="mt-8 border-t border-wt-border pt-6">
        <h4 className="mb-3 text-sm font-semibold">Assigned projects</h4>
        {profileAssignedProjectsLoading ? (
          <p className="text-sm text-wt-text-muted">Loading assigned projects…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={profileAssignedProjectsForTable}
            emptyLabel="No projects assigned."
            compact
          />
        )}
      </div>
    );
  };

  const renderEditPanel = () => (
    <div className="rounded-xl border border-wt-border bg-wt-surface-1 p-7 md:p-8">
      <h3 className="mb-1 font-semibold">Edit Profile</h3>
      <p className="mb-4 text-sm text-wt-text-muted">You are onboarded. Update your profile details anytime.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <InputField label="Phone Number" value={selfProfileForm.phone_number} onChange={(v) => setSelfProfileForm((p) => ({ ...p, phone_number: v }))} />
        <InputField label="Primary Skills (comma separated)" value={selfProfileForm.primary_skills} onChange={(v) => setSelfProfileForm((p) => ({ ...p, primary_skills: v }))} />
        <InputField label="Secondary Skill" value={selfProfileForm.secondary_skill} onChange={(v) => setSelfProfileForm((p) => ({ ...p, secondary_skill: v }))} />
        <SelectField
          label="Secondary Skill Rating"
          placeholder="Select rating"
          value={selfProfileForm.secondary_rating}
          options={["1", "2", "3", "4", "5"]}
          onChange={(v) => setSelfProfileForm((p) => ({ ...p, secondary_rating: v }))}
        />
        <InputField label="Years of Experience" value={selfProfileForm.yoe} onChange={(v) => setSelfProfileForm((p) => ({ ...p, yoe: v }))} />
      </div>
      {priorEmploymentDocsForProfile ? (
        <div className="mt-4 rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="mb-2 text-sm font-medium text-wt-text">Prior employment (YoE &gt; 0)</p>
          <p className="mb-3 text-xs text-wt-text-muted">
            Relieving letter and a payslip are required when years of experience is greater than zero.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FileField label="Relieving letter (previous company)" required accept=".pdf,image/*" onPick={(file) => setSelfProfileEmploymentFiles((p) => ({ ...p, reliving_letter: file }))} />
            <FileField label="Upload last 3 months's payslip" required accept=".pdf,image/*" onPick={(file) => setSelfProfileEmploymentFiles((p) => ({ ...p, salary_slips: file }))} />
          </div>
        </div>
      ) : null}
      <div className="mt-3">
        <FileField label="Profile Picture (optional)" accept="image/*" onPick={setSelfProfilePic} />
      </div>
      <div className="mt-4">
        <button
          type="button"
          className="btn-primary px-3 py-2"
          onClick={() =>
            runAction("Update my profile", async () => {
              const primarySkills = selfProfileForm.primary_skills
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              if (priorEmploymentDocsForProfile) {
                if (!selfProfileEmploymentFiles.reliving_letter) {
                  throw new Error("Please upload your relieving letter from the previous company.");
                }
                if (!selfProfileEmploymentFiles.salary_slips) {
                  throw new Error("Please upload a payslip file in the payslip field.");
                }
              }
              const files = [
                selfProfileEmploymentFiles.reliving_letter,
                selfProfileEmploymentFiles.salary_slips,
                selfProfilePic,
              ].filter((f): f is File => Boolean(f));
              for (const file of files) {
                if (file.size > MAX_ONBOARD_FILE_BYTES) {
                  throw new Error("A selected file exceeds 2 MB. Please upload a smaller file.");
                }
              }
              const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
              if (totalBytes > MAX_ONBOARD_TOTAL_BYTES) {
                throw new Error("Total upload size exceeds 6 MB. Compress files and retry.");
              }
              const fd = new FormData();
              const yoeValue = selfProfileForm.yoe ? Number(selfProfileForm.yoe) : null;
              fd.append(
                "body",
                JSON.stringify({
                  phone_number: selfProfileForm.phone_number || null,
                  primary_skills: primarySkills.length ? primarySkills : null,
                  secondary_skills: selfProfileForm.secondary_skill
                    ? [
                        {
                          skill: selfProfileForm.secondary_skill.trim(),
                          rating: Number(selfProfileForm.secondary_rating),
                        },
                      ]
                    : [],
                  experience: yoeValue && yoeValue > 0 ? `${yoeValue} years` : null,
                  yoe: yoeValue,
                })
              );
              if (selfProfilePic) fd.append("profilePic", selfProfilePic);
              if (selfProfileEmploymentFiles.reliving_letter) {
                fd.append("reliving_letter", selfProfileEmploymentFiles.reliving_letter);
              }
              if (selfProfileEmploymentFiles.salary_slips) {
                fd.append("salary_slips[]", selfProfileEmploymentFiles.salary_slips);
              }
              await hrmsService.updateMyProfile(fd);
              setSelfProfileForm(createEmptySelfProfileForm());
              setSelfProfileEmploymentFiles({ reliving_letter: null, salary_slips: null });
              setSelfProfilePic(null);
              setIsEditingOwnProfile(false);
              await loadMyProfile();
            })
          }
          disabled={actionLoading}
        >
          Save Profile Changes
        </button>
        <button
          type="button"
          className="btn-ghost ml-2 px-3 py-2"
          onClick={() => setIsEditingOwnProfile(false)}
          disabled={actionLoading}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <>
      <DashboardPageShell>
        <section className="max-w-5xl">
          {isProfileLoading ? (
            <div className="rounded-xl border border-wt-border bg-wt-surface-1 p-10">
              <div className="flex items-center gap-3 text-sm text-wt-text-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-wt-border border-t-wt-text" />
                Loading profile...
              </div>
            </div>
          ) : null}
          {isOffboarded ? <OffboardedBanner /> : null}
          {!isProfileLoading && !isOffboarded && requiresSelfOnboarding ? <OnboardingPendingBanner /> : null}
          {!isProfileLoading && !isOffboarded && employeeSelfServeProfile && requiresSelfOnboarding ? (
            <SelfOnboardingPanel
              key={[
                String(employeeProfile?.emp_id ?? user?.email ?? "onboard"),
                String(employeeProfile?.personal_email ?? "").trim(),
                String(employeeProfile?.resume_share_link ?? employeeProfile?.resumeShareLink ?? "").trim(),
              ].join("|")}
              workEmail={user?.email ?? ""}
              initialPersonalEmail={String(employeeProfile?.personal_email ?? "").trim()}
              initialResumeShareLink={String(
                employeeProfile?.resume_share_link ?? employeeProfile?.resumeShareLink ?? ""
              ).trim()}
              actionLoading={actionLoading}
              runAction={(label, fn) => {
                void runAction(label, fn);
              }}
              onSuccess={handleOnboardingSuccess}
            />
          ) : null}

          {!isProfileLoading && !isOffboarded && (!employeeSelfServeProfile || !requiresSelfOnboarding) ? (
            isEditingOwnProfile ? (
              renderEditPanel()
            ) : (
              <div className="rounded-xl border border-wt-border bg-wt-surface-1 p-7 md:p-8">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-5">
                    <ProfilePhotoAvatar profile={employeeProfile} fallbackName={user?.name} />
                    <div className="min-w-0">
                      <h3 className="mb-1 text-lg font-semibold">Profile</h3>
                      <p className="text-sm text-wt-text-muted">
                        Review your profile details before editing.
                      </p>
                    </div>
                  </div>
                  {employeeSelfServeProfile ? (
                    <button
                      type="button"
                      className="btn-primary px-4 py-2.5"
                      onClick={openOwnProfileEditor}
                      disabled={actionLoading}
                    >
                      Edit Profile
                    </button>
                  ) : null}
                </div>
                {renderProfileDetails(
                  <ProfileField
                    label="Roles"
                    value={(user?.roles ?? []).length ? (user?.roles ?? []).join(", ") : "—"}
                  />
                )}
                {!requiresSelfOnboarding ? renderAssignedProjects() : null}
                {!requiresSelfOnboarding ? (
                  <div className="mt-8 border-t border-wt-border pt-6">
                    <EmployeeTrainingMarksCard variant="employee" enabled />
                  </div>
                ) : null}
              </div>
            )
          ) : null}
        </section>
      </DashboardPageShell>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50">
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </>
  );
}
