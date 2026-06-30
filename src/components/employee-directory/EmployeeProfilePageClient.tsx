"use client";

import { Button } from "@/components/ui/button";
import {
  ProfileDetailsSkeleton,
  ProfileHeaderSkeleton,
} from "@/components/dashboard/ui/SectionSkeleton";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { HARDCODED_DEPARTMENT_OPTIONS } from "@/constants/dashboard";
import { useEmployeeDirectoryAccess } from "@/hooks/employee-directory/useEmployeeDirectoryAccess";
import {
  useEmployeeProfile,
  useUpdateEmployeeProfile,
} from "@/hooks/employee-directory/useEmployeeProfile";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows, toRows } from "@/utils/apiRows";
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
import { validatePersonalEmail, validateWorkEmail } from "@/utils/personalEmail";
import {
  buildResumeShareLinkIndex,
  lookupResumeShareLink,
} from "@/utils/employeeResume";
import { canFetchEmployeeResumeApi } from "@/utils/roles";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { AdaptiveSelectField, InputField } from "@/components/dashboard/ui/forms";
import { FormActionBar } from "@/components/dashboard/ui/FormActionBar";
import { FormSection, FormSubsection } from "@/components/dashboard/ui/FormSection";
import { EmployeeProfileHeaderCard } from "@/components/employee-directory/EmployeeProfileHeaderCard";
import { EmployeeProfileView } from "@/components/employee-directory/EmployeeProfileView";
import { IconPencil } from "@/components/employee-directory/employeeDirectoryIcons";
const WORK_MODES = ["WFO", "WFH", "HYBRID"];
const WORK_LOCATIONS = ["OFFSHORE", "ONSITE", "HYBRID", "REMOTE"];
const USER_STATUSES = ["ACTIVE", "INACTIVE", "PENDING", "ONBOARDING"];
const SKILL_RATINGS = ["1", "2", "3", "4", "5"];

type BandOption = { id: string; label: string };

export function EmployeeProfilePageClient() {
  const params = useParams();
  const empId = decodeURIComponent(String(params?.empId ?? "").trim());
  const {
    authStatus,
    canView: canViewProfile,
    canEditProfile,
    canEditProfileStatusOnly,
    canOpenProfileEditor,
    queriesEnabled,
    roles,
  } = useEmployeeDirectoryAccess();
  const { actionLoading, runAction } = useDashboardAction();
  const { data: profile, isLoading, isError, error, refetch } = useEmployeeProfile(empId, {
    enabled: queriesEnabled,
  });
  const { data: resumePayload } = useEmployeeResumes({
    enabled: queriesEnabled && canFetchEmployeeResumeApi(roles),
  });
  const updateMutation = useUpdateEmployeeProfile(empId);

  const statusOnlyEdit = canEditProfileStatusOnly && !canEditProfile;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EmployeeProfileEditForm | null>(null);
  const [bandOptions, setBandOptions] = useState<BandOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const profileRecord = profile ?? {};
  const displayName = cleanEmployeeName(profileRecord) || "Employee";
  const department = String(pickProfileField(profileRecord, ["department"]) ?? "").trim();
  const email = String(pickProfileField(profileRecord, ["email"]) ?? "").trim();
  const phone = formatProfileDisplayValue(
    pickProfileField(profileRecord, ["phone_number", "phoneNumber"])
  );
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
        const [bandsRes, departmentsRes] = await Promise.all([
          hrmsService.getBands(),
          hrmsService.getDepartments(),
        ]);
        if (cancelled) return;
        const rows = toRows((bandsRes as { data?: unknown }).data ?? bandsRes);
        const bands = rows
          .map((row) => {
            const id = String(row.id ?? row.band_id ?? row.bandId ?? "").trim();
            const name = String(row.name ?? row.band_name ?? row.bandName ?? "").trim();
            if (!id && !name) return null;
            return { id: id || name, label: name || id };
          })
          .filter((band): band is BandOption => band !== null);
        setBandOptions(bands);

        let departments = Array.from(
          new Set(
            toPagedRows((departmentsRes as { data?: unknown }).data ?? departmentsRes)
              .map((row) =>
                String(
                  row.department ??
                    row.department_name ??
                    row.departmentName ??
                    row.name ??
                    row.value ??
                    ""
                ).trim()
              )
              .filter((value) => Boolean(value))
          )
        ).sort();

        if (!departments.length) {
          departments = Array.from(
            new Set(
              rows
                .map((row) => String(row.stream ?? row.department ?? "").trim())
                .filter((value) => Boolean(value))
            )
          ).sort();
        }

        setDepartmentOptions(
          Array.from(new Set([...HARDCODED_DEPARTMENT_OPTIONS, ...departments])).sort()
        );
      } catch {
        if (!cancelled) {
          setBandOptions([]);
          setDepartmentOptions([...HARDCODED_DEPARTMENT_OPTIONS]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, canEditProfile]);

  const bandSelectOptions = useMemo(() => {
    const options = [...bandOptions];
    const currentId = editForm?.band_id?.trim();
    if (currentId && !options.some((band) => band.id === currentId)) {
      const bandName = String(
        pickProfileField(profileRecord, ["band", "band_name", "bandName"]) ?? ""
      ).trim();
      options.unshift({ id: currentId, label: bandName || currentId });
    }
    return options;
  }, [bandOptions, editForm?.band_id, profileRecord]);

  const bandSelectValue = editForm?.band_id?.trim() ?? "";

  const departmentSelectOptions = useMemo(() => {
    const deps = [...departmentOptions];
    const current = editForm?.department?.trim();
    if (current && !deps.includes(current)) deps.unshift(current);
    return deps;
  }, [departmentOptions, editForm?.department]);

  const workModeOptions = useMemo(() => {
    const current = editForm?.work_mode?.trim();
    if (current && !WORK_MODES.includes(current)) {
      return [current, ...WORK_MODES];
    }
    return WORK_MODES;
  }, [editForm?.work_mode]);

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
    void runAction(
      statusOnlyEdit ? "Update employee status" : "Update employee profile",
      async () => {
        if (!statusOnlyEdit) {
          const workEmailError = validateWorkEmail(editForm.email);
          if (workEmailError) throw new Error(workEmailError);
          const personalError = validatePersonalEmail(editForm.email, editForm.personal_email, {
            required: false,
          });
          if (personalError) throw new Error(personalError);
        }
        await updateMutation.mutateAsync(
          editFormToUpdatePayload(editForm, { statusOnly: statusOnlyEdit })
        );
        await refetch();
        setIsEditing(false);
        setEditForm(null);
      }
    );
  };

  if (authStatus !== "loading" && !canViewProfile) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 shadow-sm">
          <h3 className="text-lg font-semibold">Access Restricted</h3>
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
    <DashboardPageShell className="employee-profile-page">
      <div className="employee-profile-scroll-root w-full">
        <Link
          href={DASHBOARD_ROUTES["employee-directory"]}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to directory
        </Link>

        {isLoading ? (
          <div className="mt-6 space-y-4">
            <ProfileHeaderSkeleton />
            <ProfileDetailsSkeleton rows={10} />
          </div>
        ) : null}

        {isError ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p>Could not load profile.{error instanceof Error ? ` ${error.message}` : ""}</p>
            <Button
              variant="ghost"
              size="xs"
              type="button"
              className="mt-3 px-3 py-1.5 text-xs"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <div className="mt-6 space-y-4">
            {isEditing && editForm ? (
              <div className="space-y-6">
                <EmployeeProfileHeaderCard
                  profile={profileRecord}
                  displayName={displayName}
                  designation={employeeRole}
                  department={department}
                  empId={empIdDisplay}
                  email={email}
                  phone={phone}
                  resumeShareHref={resumeShareHref}
                  editModeLabel="Edit Mode"
                />

                {statusOnlyEdit ? (
                  <FormSection
                    title="Employee Status"
                    description="Update the employee account status. Other profile fields cannot be changed from this role."
                  >
                    <div className="max-w-sm">
                      <AdaptiveSelectField
                        label="Status"
                        value={editForm.user_status}
                        options={USER_STATUSES}
                        onChange={(v) => setEditForm({ ...editForm, user_status: v })}
                      />
                    </div>
                  </FormSection>
                ) : (
                  <FormSection
                    title="Information"
                    description="Employment details, department, and work arrangement."
                  >
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                      <InputField
                        label="Name"
                        value={editForm.name}
                        onChange={(v) => setEditForm({ ...editForm, name: v })}
                      />
                      <InputField
                        label="Work Email"
                        type="email"
                        required
                        value={editForm.email}
                        onChange={(v) => setEditForm({ ...editForm, email: v })}
                      />
                      <AdaptiveSelectField
                        label="Department"
                        value={editForm.department}
                        placeholder="Select Department"
                        searchPlaceholder="Search Departments…"
                        options={departmentSelectOptions}
                        onChange={(v) => setEditForm({ ...editForm, department: v })}
                      />
                      <AdaptiveSelectField
                        label="Status"
                        value={editForm.user_status}
                        options={USER_STATUSES}
                        onChange={(v) => setEditForm({ ...editForm, user_status: v })}
                      />
                      <AdaptiveSelectField
                        label="Work Mode"
                        value={editForm.work_mode}
                        options={workModeOptions}
                        onChange={(v) => setEditForm({ ...editForm, work_mode: v })}
                      />
                      <AdaptiveSelectField
                        label="Work Location"
                        value={editForm.work_location_type}
                        options={WORK_LOCATIONS}
                        onChange={(v) => setEditForm({ ...editForm, work_location_type: v })}
                      />
                      <AdaptiveSelectField
                        label="Band"
                        value={bandSelectValue}
                        placeholder="Select Band"
                        searchPlaceholder="Search Bands…"
                        options={bandSelectOptions.map((band) => ({
                          value: band.id,
                          label: band.label,
                        }))}
                        onChange={(id) => setEditForm({ ...editForm, band_id: id })}
                      />
                    </div>

                    <FormSubsection title="Skills">
                      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
                        <InputField
                          label="Primary Skills"
                          value={editForm.primary_skills}
                          onChange={(v) => setEditForm({ ...editForm, primary_skills: v })}
                        />
                        <InputField
                          label="Secondary Skill"
                          value={editForm.secondary_skill}
                          onChange={(v) => setEditForm({ ...editForm, secondary_skill: v })}
                        />
                        <AdaptiveSelectField
                          label="Secondary Skill Rating"
                          value={editForm.secondary_rating}
                          placeholder="Select Rating"
                          options={SKILL_RATINGS}
                          onChange={(v) => setEditForm({ ...editForm, secondary_rating: v })}
                        />
                      </div>
                    </FormSubsection>
                  </FormSection>
                )}

                <FormActionBar
                  hint={
                    statusOnlyEdit
                      ? "Only the employee status will be updated."
                      : "Review your updates, then save to apply changes to this profile."
                  }
                  saving={actionLoading || updateMutation.isPending}
                  onCancel={cancelEditor}
                  onSave={saveProfile}
                />
              </div>
            ) : (
              <EmployeeProfileView
                profile={profileRecord}
                displayName={displayName}
                designation={employeeRole}
                department={department}
                empId={empId}
                empIdDisplay={empIdDisplay}
                email={email}
                phone={phone}
                profileUserId={profileUserId}
                resumeShareHref={resumeShareHref}
                queriesEnabled={queriesEnabled}
                headerAction={
                  canOpenProfileEditor ? (
                    <Button
                      variant="brand"
                      size="sm"
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm"
                      onClick={openEditor}
                    >
                      <IconPencil />
                      {statusOnlyEdit ? "Edit Status" : "Edit Profile"}
                    </Button>
                  ) : null
                }
              />
            )}
          </div>
        ) : null}
      </div>
    </DashboardPageShell>
  );
}
