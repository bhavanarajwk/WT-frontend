"use client";

import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hrmsService } from "@/services/hrms.service";
import { ApiError } from "@/api/error";
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
import { formatApiDateDisplay } from "@/utils/apiDate";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { ProfileEmployeeTrainingsSection } from "@/components/dashboard/profile/ProfileEmployeeTrainingsSection";
import { ProfileAssignedProjectsSection } from "@/components/dashboard/profile/ProfileAssignedProjectsSection";
import {
  ProfileDetailsSkeleton,
  ProfileHeaderSkeleton,
  TableRowsSkeleton,
} from "@/components/dashboard/ui/SectionSkeleton";
import { fetchSelfProfile, shouldSkipSelfProfileFetch } from "@/utils/selfProfile";
import {
  isActiveUserStatus,
  isOffboardedUserStatus,
  resolveProfileStatus,
} from "@/utils/userStatus";
import { buildProfileAssignedProjects } from "@/utils/dashboard/projects";
import { OffboardedBanner } from "@/components/dashboard/shared/OffboardedBanner";
import { OnboardingPendingBanner } from "@/components/dashboard/shared/OnboardingPendingBanner";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";


export function ProfilePageLeanClient() {
  const { user, refresh: refreshSession } = useAuth();
  const router = useRouter();
  const userRoles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = userRoles.includes("ROLE_MANAGER");
  const isEmployee = userRoles.includes("ROLE_EMPLOYEE");
  const restrictForPendingOnboarding = isEmployee && !hasHrAccess && !hasManagerAccess;
  const employeeSelfServeProfile = isEmployee && !hasHrAccess;

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
    if (!user || isProfileLoading || requiresSelfOnboarding) return;
    const load = async () => {
      setProfileAssignedProjectsLoading(true);
      try {
        const [assignedRes, myAllocationsRes] = await Promise.allSettled([
          hrmsService.getAssignedProjects(),
          hrmsService.getMyAllocations(),
        ]);
        if (assignedRes.status !== "fulfilled") {
          setProfileAssignedProjects([]);
          return;
        }
        const allocationInput =
          myAllocationsRes.status === "fulfilled"
            ? myAllocationsRes.value.data ?? myAllocationsRes.value
            : undefined;
        setProfileAssignedProjects(
          buildProfileAssignedProjects(
            assignedRes.value.data ?? assignedRes.value,
            allocationInput
          )
        );
      } finally {
        setProfileAssignedProjectsLoading(false);
      }
    };
    void load();
  }, [user, isProfileLoading, requiresSelfOnboarding]);

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
      showSuccessToast(formatActionSuccessMessage(label));
    } catch (error) {
      const backendMessage =
        error instanceof ApiError ? error.message : error instanceof Error ? error.message : "";
      showErrorToast(formatActionErrorMessage(label, backendMessage));
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

  const profileDisplayName =
    String(employeeProfile?.name ?? user?.name ?? "").trim() || "Profile";

  const renderProfileDetails = () => (
    <div className="space-y-7">
      <div>
        <h4 className="mb-3 text-sm font-semibold text-wt-text">Personal &amp; Employment Information</h4>
        <div className="space-y-10 md:space-y-12 rounded-xl border border-wt-border bg-wt-surface-2/50 p-6 md:p-8">
          <section>
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-wt-text-muted">Basic Information</h5>
            <dl className="space-y-3 text-sm">
              <ProfileField label="Status" value={employeeProfile?.status ?? user?.status} />
              <ProfileField label="User Type" value={readProfileField(employeeProfile, "user_type", "userType") ?? user?.user_type} />
              <ProfileField label="Department" value={readProfileField(employeeProfile, "department")} />
              <ProfileField label="Designation" value={readProfileField(employeeProfile, "role")} />
              <ProfileField label="Band" value={readProfileField(employeeProfile, "band_name", "bandName")} />
              <ProfileField label="Category" value={profileCategory} />
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
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-wt-text-muted">Information</h5>
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

  const renderAssignedProjects = () => (
    <ProfileAssignedProjectsSection
      rows={profileAssignedProjects}
      loading={profileAssignedProjectsLoading}
    />
  );

  const renderEditPanel = () => (
    <div className="rounded-xl border border-wt-border bg-wt-surface-1 p-10 md:p-12">
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
        <FileField label="Profile Picture (required)" required accept="image/*" onPick={setSelfProfilePic} />
      </div>
      <div className="mt-4">
        <Button variant="brand" type="button" className="px-3 py-2" onClick={() =>
            runAction("Update my profile", async () => {
              const primarySkills = selfProfileForm.primary_skills
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              if (!selfProfilePic) {
                throw new Error("Profile picture is mandatory. Please upload your profile picture.");
              }
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
        </Button>
        <Button variant="ghost" type="button" className="ml-2 px-3 py-2" onClick={() => setIsEditingOwnProfile(false)}
          disabled={actionLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <DashboardPageShell>
        <section className="w-full">
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

          {!isOffboarded && (!employeeSelfServeProfile || !requiresSelfOnboarding || isProfileLoading) ? (
            isEditingOwnProfile && !isProfileLoading ? (
              renderEditPanel()
            ) : (
              <div className="rounded-xl border border-wt-border bg-wt-surface-1 p-10 md:p-12">
                {isProfileLoading ? (
                  <>
                    <ProfileHeaderSkeleton />
                    <div className="mt-6">
                      <ProfileDetailsSkeleton />
                    </div>
                    <div className="mt-8 border-t border-wt-border pt-6">
                      <h4 className="mb-3 text-sm font-semibold text-wt-text">Project Details</h4>
                      <TableRowsSkeleton rows={3} columns={5} />
                    </div>
                  </>
                ) : (
                  <>
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-5">
                    <ProfilePhotoAvatar profile={employeeProfile} fallbackName={user?.name} />
                    <div className="min-w-0">
                      <h3 className="mb-1 text-lg font-semibold">{profileDisplayName}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-wt-text-muted">
                        {(() => {
                          const status = resolveProfileStatus(employeeProfile, user);
                          return status ? <EmployeeStatusBadge status={status} /> : null;
                        })()}
                        {(() => {
                          const email = employeeProfile?.email ?? user?.email;
                          return email ? <span className="text-blue-600">{String(email)}</span> : null;
                        })()}
                        {(() => {
                          const phone = readProfileField(employeeProfile, "phone_number", "phoneNumber");
                          return phone ? <span>{phone}</span> : null;
                        })()}
                      </div>
                    </div>
                  </div>
                  {employeeSelfServeProfile ? (
                    <Button variant="brand" type="button" className="px-4 py-2.5" onClick={openOwnProfileEditor} disabled={actionLoading} >
                      Edit Profile
                    </Button>
                  ) : null}
                </div>
                {renderProfileDetails()}
                {!requiresSelfOnboarding ? renderAssignedProjects() : null}
                {!requiresSelfOnboarding ? <ProfileEmployeeTrainingsSection enabled /> : null}
                  </>
                )}
              </div>
            )
          ) : null}
        </section>
      </DashboardPageShell>

    </>
  );
}
