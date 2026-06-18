"use client";

import { useEffect, useMemo, useState } from "react";
import { hrmsService } from "@/services/hrms.service";
import { MAX_ONBOARD_FILE_BYTES, MAX_ONBOARD_TOTAL_BYTES } from "@/constants/dashboard";
import { InputField, SelectField, FileField, TextAreaField } from "@/components/dashboard/ui/forms";
import { isValidIndiaMobile, isValidPersonName } from "@/utils/dashboard/validation";
import { validatePersonalEmail } from "@/utils/personalEmail";
import { validateResumeShareLink } from "@/utils/employeeResume";
import { createEmptySelfOnboardForm } from "@/utils/selfOnboardFormState";
import { FALLBACK_ONBOARD_OPTIONS } from "@/utils/onboardFormOptions";
import { useOnboardOptions } from "@/hooks/useOnboardOptions";

type OnboardFiles = {
  profile_photo: File | null;
  aadhaar: File | null;
  pan_card: File | null;
  reliving_letter: File | null;
  salary_slips: File | null;
};

const EMPTY_FILES: OnboardFiles = {
  profile_photo: null,
  aadhaar: null,
  pan_card: null,
  reliving_letter: null,
  salary_slips: null,
};

export function SelfOnboardingPanel({
  workEmail,
  initialPersonalEmail = "",
  initialResumeShareLink = "",
  actionLoading,
  runAction,
  onSuccess,
}: {
  workEmail: string;
  initialPersonalEmail?: string;
  initialResumeShareLink?: string;
  actionLoading: boolean;
  runAction: (label: string, fn: () => Promise<void>) => void;
  onSuccess: () => Promise<void>;
}) {
  const [formKey, setFormKey] = useState(0);
  const [form, setForm] = useState(createEmptySelfOnboardForm);
  const [files, setFiles] = useState<OnboardFiles>(EMPTY_FILES);
  const onboardOptionsQ = useOnboardOptions();
  const options = onboardOptionsQ.data ?? FALLBACK_ONBOARD_OPTIONS;

  const email = useMemo(() => workEmail.trim(), [workEmail]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      personal_email: initialPersonalEmail.trim() || prev.personal_email,
      resume_share_link: initialResumeShareLink.trim() || prev.resume_share_link,
    }));
  }, [initialPersonalEmail, initialResumeShareLink]);

  const priorEmploymentDocsRequired = useMemo(() => {
    const raw = String(form.yoe ?? "").trim().replace(",", ".");
    if (!raw) return false;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0;
  }, [form.yoe]);

  const resetForm = () => {
    setForm(createEmptySelfOnboardForm());
    setFiles(EMPTY_FILES);
    setFormKey((key) => key + 1);
  };

  const submit = () => {
    void runAction("Submit onboarding", async () => {
      if (!email) {
        throw new Error("Unable to resolve logged-in email.");
      }

      const personalEmail = form.personal_email.trim();
      const personalEmailError = validatePersonalEmail(email, personalEmail, { required: true });
      if (personalEmailError) throw new Error(personalEmailError);

      const legalName = form.full_name.trim();
      if (!legalName || !isValidPersonName(legalName)) {
        throw new Error("Enter your full name as per ID (letters and spaces, 2–120 characters).");
      }

      const resumeShareLink = form.resume_share_link.trim();
      const resumeLinkError = validateResumeShareLink(resumeShareLink);
      if (resumeLinkError) throw new Error(resumeLinkError);

      const yoeValue = form.yoe.trim() ? Number(form.yoe) : null;
      if (form.yoe.trim() && (!Number.isFinite(yoeValue) || yoeValue! < 0)) {
        throw new Error("Years of experience must be a valid number.");
      }

      const experience = form.experience.trim();
      if (priorEmploymentDocsRequired && !experience) {
        throw new Error("Experience summary is required when years of experience is greater than zero.");
      }

      const emergencyNumber = form.emergency_contact_number.trim();
      if (emergencyNumber && !isValidIndiaMobile(emergencyNumber)) {
        throw new Error("Enter a valid emergency contact number.");
      }

      if (!files.profile_photo) throw new Error("Please upload profile photo.");
      if (!files.aadhaar) throw new Error("Please upload Aadhaar.");
      if (!files.pan_card) throw new Error("Please upload PAN card.");

      if (priorEmploymentDocsRequired) {
        if (!files.reliving_letter) {
          throw new Error("Please upload your relieving letter from the previous company.");
        }
        if (!files.salary_slips) {
          throw new Error("Please upload a payslip file in the payslip field.");
        }
      }

      if (files.profile_photo.type && !files.profile_photo.type.startsWith("image/")) {
        throw new Error("Profile photo must be an image file (jpg/png/webp).");
      }

      const selectedFiles: Array<[string, File]> = [];
      for (const [key, val] of Object.entries(files)) {
        if (val) selectedFiles.push([key, val as File]);
      }
      for (const [key, file] of selectedFiles) {
        if (file.size > MAX_ONBOARD_FILE_BYTES) {
          throw new Error(`${key.replaceAll("_", " ")} exceeds 2 MB. Please upload a smaller file.`);
        }
      }
      const totalBytes = selectedFiles.reduce((sum, [, file]) => sum + file.size, 0);
      if (totalBytes > MAX_ONBOARD_TOTAL_BYTES) {
        throw new Error("Total upload size exceeds 6 MB. Compress files and retry.");
      }

      const primarySkills = form.primary_skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const userData: Record<string, unknown> = {
        email,
        personal_email: personalEmail,
        name: legalName,
        resume_share_link: resumeShareLink,
      };

      if (yoeValue !== null) userData.yoe = yoeValue;
      if (experience) userData.experience = experience;
      if (primarySkills.length) userData.primary_skills = primarySkills;
      if (form.secondary_skill.trim()) {
        userData.secondary_skills = [
          { skill: form.secondary_skill.trim(), rating: Number(form.secondary_rating || "0") },
        ];
      }
      if (form.work_location_type) userData.work_location_type = form.work_location_type;
      if (form.local_address.trim()) userData.local_address = form.local_address.trim();
      if (form.permanent_address.trim()) userData.permanent_address = form.permanent_address.trim();
      if (form.gender) userData.gender = form.gender;
      if (form.marital_status) userData.marital_status = form.marital_status;
      if (form.blood_group) userData.blood_group = form.blood_group;
      if (form.emergency_contact_name.trim()) {
        userData.emergency_contact_name = form.emergency_contact_name.trim();
      }
      if (emergencyNumber) userData.emergency_contact_number = emergencyNumber;

      const fd = new FormData();
      fd.append("user_data", JSON.stringify(userData));

      for (const [key, file] of Object.entries(files)) {
        if (key === "salary_slips") {
          if (file) fd.append("salary_slips[]", file as File);
          continue;
        }
        if (!file) continue;
        fd.append(key, file as File);
      }

      await hrmsService.completeMyOnboarding(fd);
      resetForm();
      await onSuccess();
    });
  };

  return (
    <div key={formKey} className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
      <h3 className="font-semibold mb-1">Complete Your Onboarding</h3>
      <p className="text-sm text-wt-text-muted mb-4">
        Submit your onboarding survey to activate full portal access. Fields marked with * are required.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs text-wt-text-muted flex flex-col gap-1">
          Work email
          <input
            className="input-field px-3 py-2 text-sm bg-wt-surface-2 text-wt-text-muted"
            type="email"
            value={email}
            readOnly
            disabled
          />
        </label>
        <InputField
          label="Personal mail ID"
          type="email"
          required
          value={form.personal_email}
          onChange={(v) => setForm((p) => ({ ...p, personal_email: v }))}
        />
        <InputField
          label="Full name (as per ID)"
          required
          value={form.full_name}
          onChange={(v) => setForm((p) => ({ ...p, full_name: v }))}
        />
        <InputField
          label="Years of Experience"
          value={form.yoe}
          onChange={(v) => setForm((p) => ({ ...p, yoe: v }))}
        />
        {priorEmploymentDocsRequired ? (
          <InputField
            label="Experience summary"
            required
            placeholder="e.g. 2 years at XYZ Corp"
            value={form.experience}
            onChange={(v) => setForm((p) => ({ ...p, experience: v }))}
          />
        ) : null}
        <InputField
          label="Primary Skills (comma separated)"
          value={form.primary_skills}
          onChange={(v) => setForm((p) => ({ ...p, primary_skills: v }))}
        />
        <InputField
          label="Secondary Skill"
          value={form.secondary_skill}
          onChange={(v) => setForm((p) => ({ ...p, secondary_skill: v }))}
        />
        <SelectField
          label="Secondary Skill Rating"
          placeholder="Select"
          value={form.secondary_rating}
          options={["1", "2", "3", "4", "5"]}
          onChange={(v) => setForm((p) => ({ ...p, secondary_rating: v }))}
        />
        <SelectField
          label="Work Location"
          placeholder="Select"
          value={form.work_location_type}
          options={options.work_location_types}
          onChange={(v) => setForm((p) => ({ ...p, work_location_type: v }))}
        />
        <SelectField
          label="Gender"
          placeholder="Select"
          value={form.gender}
          options={options.genders}
          onChange={(v) => setForm((p) => ({ ...p, gender: v }))}
        />
        <SelectField
          label="Marital status"
          placeholder="Select"
          value={form.marital_status}
          options={options.marital_statuses}
          onChange={(v) => setForm((p) => ({ ...p, marital_status: v }))}
        />
        <SelectField
          label="Blood group"
          placeholder="Select"
          value={form.blood_group}
          options={options.blood_groups}
          onChange={(v) => setForm((p) => ({ ...p, blood_group: v }))}
        />
        <InputField
          label="Emergency contact name"
          value={form.emergency_contact_name}
          onChange={(v) => setForm((p) => ({ ...p, emergency_contact_name: v }))}
        />
        <InputField
          label="Emergency contact number"
          value={form.emergency_contact_number}
          onChange={(v) => setForm((p) => ({ ...p, emergency_contact_number: v }))}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <TextAreaField
          label="Local address"
          className="sm:col-span-2"
          value={form.local_address}
          onChange={(v) => setForm((p) => ({ ...p, local_address: v }))}
        />
        <TextAreaField
          label="Permanent address"
          className="sm:col-span-2"
          value={form.permanent_address}
          onChange={(v) => setForm((p) => ({ ...p, permanent_address: v }))}
        />
        <InputField
          label="Resume (Google Docs link)"
          type="url"
          required
          placeholder="https://docs.google.com/document/d/..."
          value={form.resume_share_link}
          onChange={(v) => setForm((p) => ({ ...p, resume_share_link: v }))}
        />
        <FileField
          label="Profile Photo"
          required
          accept="image/*"
          onPick={(file) => setFiles((p) => ({ ...p, profile_photo: file }))}
        />
        <FileField label="Aadhaar" required accept=".pdf,image/*" onPick={(file) => setFiles((p) => ({ ...p, aadhaar: file }))} />
        <FileField label="PAN Card" required accept=".pdf,image/*" onPick={(file) => setFiles((p) => ({ ...p, pan_card: file }))} />
      </div>
      {priorEmploymentDocsRequired ? (
        <div className="mt-4 rounded-xl border border-wt-border bg-wt-surface-2 p-4">
          <p className="text-sm font-medium text-wt-text mb-2">Prior employment (YoE &gt; 0)</p>
          <p className="text-xs text-wt-text-muted mb-3">
            Relieving letter and a payslip are required when years of experience is greater than zero.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FileField
              label="Relieving letter (previous company)"
              required
              accept=".pdf,image/*"
              onPick={(file) => setFiles((p) => ({ ...p, reliving_letter: file }))}
            />
            <FileField
              label="Upload last 3 months's payslip"
              required
              accept=".pdf,image/*"
              onPick={(file) => setFiles((p) => ({ ...p, salary_slips: file }))}
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-wt-text-muted">
          If your years of experience is above zero, add an experience summary, relieving letter, and payslip (fields
          appear when YoE &gt; 0).
        </p>
      )}
      <div className="mt-4">
        <button type="button" className="btn-primary px-3 py-2" onClick={submit} disabled={actionLoading}>
          Submit Onboarding Form
        </button>
      </div>
    </div>
  );
}
