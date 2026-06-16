"use client";

import { useEffect, useMemo, useState } from "react";
import { hrmsService } from "@/services/hrms.service";
import { InputField, SelectField, TextAreaField } from "@/components/dashboard/ui/forms";
import { isValidIndiaMobile, isValidPersonName } from "@/utils/dashboard/validation";
import { parseApiDate } from "@/utils/apiDate";
import {
  bandSelectOptions,
  bandsForDepartment,
  resolveInternBandId,
} from "@/utils/dashboard/validation";
import { parseDesignationList } from "@/utils/masters";
import { validatePersonalEmail } from "@/utils/personalEmail";
import type { OnboardFormState } from "@/utils/onboardFormState";
import type { OnboardOptionsResponse } from "@/types/onboard-options";

type HrOnboardFormProps = {
  formKey: number;
  form: OnboardFormState;
  setForm: React.Dispatch<React.SetStateAction<OnboardFormState>>;
  options: OnboardOptionsResponse;
  bands: Array<Record<string, unknown>>;
  hasHrAccess: boolean;
  actionLoading: boolean;
  onSubmitSuccess: () => Promise<void>;
  onError: (message: string) => void;
  runAction: (label: string, fn: () => Promise<void>) => void;
};

function validateWorkStep(form: OnboardFormState, internBandId: number, defaultConsultantBandId: number) {
  const empId = form.emp_id.trim();
  const email = form.email.trim().toLowerCase();
  const name = form.name.trim();
  const department = form.department.trim();
  const role = form.role.trim();

  if (!empId) throw new Error("Employee ID is required.");
  if (empId.length > 50) throw new Error("Employee ID must be at most 50 characters.");
  if (!email || !name) throw new Error("Work email and name are required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid work email.");
  }
  if (!form.user_type) throw new Error("User type is required.");
  if (!department) throw new Error("Department is required.");
  if (!role) throw new Error("Designation is required.");
  if (!form.work_mode) throw new Error("Work mode is required.");
  if (!form.work_location_type) throw new Error("Work location is required.");
  if (!form.category) throw new Error("Category is required.");
  if (!isValidPersonName(name)) {
    throw new Error("Name should be 2–120 characters and contain letters (and spaces) only.");
  }

  const bandId =
    form.user_type === "CONSULTANT"
      ? defaultConsultantBandId
      : form.user_type === "INTERN"
        ? internBandId
        : Number(form.band_id);
  if (!Number.isFinite(bandId) || bandId <= 0) {
    throw new Error("Please select a valid band.");
  }

  if (form.user_type === "INTERN") {
    if (!form.doi.trim()) throw new Error("Date of internship is required for interns.");
    if (!form.internship_duration.trim()) {
      throw new Error("Internship duration is required for interns.");
    }
  } else if (!form.doj.trim()) {
    throw new Error("Date of joining is required.");
  }

  return { empId, email, name, department, role, bandId };
}

function validateOptionalPersonalStep(form: OnboardFormState, workEmail: string) {
  const personalEmailError = validatePersonalEmail(workEmail, form.personal_email.trim(), {
    required: false,
  });
  if (personalEmailError) throw new Error(personalEmailError);

  const phoneNumber = form.phone_number.trim();
  if (phoneNumber && !isValidIndiaMobile(phoneNumber)) {
    throw new Error("Phone number must be a valid Indian mobile (10 digits, optional +91).");
  }

  const dob = form.date_of_birth.trim();
  if (dob) {
    const dobDate = parseApiDate(dob);
    if (!dobDate) throw new Error("Date of birth is invalid.");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dobDate > today) throw new Error("Date of birth cannot be in the future.");
  }
}

function buildPersonalPayload(form: OnboardFormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const personalEmail = form.personal_email.trim();
  const phoneNumber = form.phone_number.trim();
  const dob = form.date_of_birth.trim();
  const localAddress = form.local_address.trim();
  const permanentAddress = form.permanent_address.trim();

  if (personalEmail) payload.personal_email = personalEmail;
  if (phoneNumber) payload.phone_number = phoneNumber;
  if (dob) payload.date_of_birth = dob;
  if (localAddress) payload.local_address = localAddress;
  if (permanentAddress) payload.permanent_address = permanentAddress;
  if (form.gender) payload.gender = form.gender;
  if (form.marital_status) payload.marital_status = form.marital_status;

  return payload;
}

export function HrOnboardForm({
  formKey,
  form,
  setForm,
  options,
  bands,
  hasHrAccess,
  actionLoading,
  onSubmitSuccess,
  onError,
  runAction,
}: HrOnboardFormProps) {
  const [step, setStep] = useState<"work" | "personal">("work");
  const [designationOptions, setDesignationOptions] = useState<Array<{ value: string; label: string }>>(
    []
  );
  const [designationLoading, setDesignationLoading] = useState(false);
  const internBandId = useMemo(() => resolveInternBandId(bands), [bands]);
  const defaultConsultantBandId = useMemo(() => {
    const first = bands[0];
    const id = first?.id != null ? Number(first.id) : NaN;
    return Number.isFinite(id) && id > 0 ? id : 0;
  }, [bands]);

  useEffect(() => {
    setStep("work");
  }, [formKey]);

  useEffect(() => {
    if (form.user_type !== "INTERN") return;
    setForm((prev) => (prev.band_id === internBandId ? prev : { ...prev, band_id: internBandId }));
  }, [form.user_type, internBandId, setForm]);

  const departmentBands = useMemo(
    () => bandsForDepartment(bands, form.department),
    [bands, form.department]
  );
  const bandOptions = useMemo(() => bandSelectOptions(departmentBands), [departmentBands]);

  useEffect(() => {
    if (!form.department.trim()) return;
    const currentBandId = Number(form.band_id);
    if (!currentBandId) return;
    const stillValid = departmentBands.some((row) => Number(row.id) === currentBandId);
    if (!stillValid) {
      setForm((prev) => ({ ...prev, band_id: 0, role: "" }));
    }
  }, [departmentBands, form.band_id, form.department, setForm]);

  useEffect(() => {
    const bandId = Number(form.band_id);
    const department = form.department.trim();
    if (form.user_type === "CONSULTANT" || bandId <= 0 || !department) {
      setDesignationOptions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setDesignationLoading(true);
        try {
          const res = await hrmsService.searchDesignations({ band_id: bandId, department });
          setDesignationOptions(
            parseDesignationList(res).map((item) => ({
              value: item.name,
              label: item.name,
            }))
          );
        } catch (error) {
          setDesignationOptions([]);
          onError(
            error instanceof Error ? error.message : "Could not load designations for this band."
          );
        } finally {
          setDesignationLoading(false);
        }
      })();
    }, 200);
    return () => window.clearTimeout(handle);
  }, [form.band_id, form.department, form.user_type, onError]);

  function goNext() {
    try {
      validateWorkStep(form, internBandId, defaultConsultantBandId);
      setStep("personal");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Please complete all work details.");
    }
  }

  function submit(includePersonal: boolean) {
    void runAction("Create employee", async () => {
      const { empId, email, name, department, role, bandId } = validateWorkStep(
        form,
        internBandId,
        defaultConsultantBandId
      );
      if (includePersonal) {
        validateOptionalPersonalStep(form, email);
      }

      const basePayload: Record<string, unknown> = {
        emp_id: empId,
        email,
        name,
        user_type: form.user_type,
        department,
        role,
        band_id: bandId,
        work_mode: form.work_mode,
        work_location_type: form.work_location_type,
        category: form.category,
        ...(form.holiday_calendar_id.trim()
          ? { holiday_calendar_id: Number(form.holiday_calendar_id) }
          : {}),
        ...(includePersonal ? buildPersonalPayload(form) : {}),
      };

      if (form.user_type === "INTERN") {
        await hrmsService.createOnboard({
          ...basePayload,
          doj: null,
          doi: form.doi.trim(),
          internship_duration: Number(form.internship_duration.trim()),
        });
      } else {
        await hrmsService.createOnboard({
          ...basePayload,
          doj: form.doj.trim(),
          doi: null,
          internship_duration: null,
        });
      }

      setStep("work");
      await onSubmitSuccess();
    });
  }

  return (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Create New Employee</h3>
          <p className="text-sm text-wt-text-muted mt-1">
            Step {step === "work" ? "1" : "2"} of 2 —{" "}
            {step === "work" ? "Work information" : "Personal details (optional)"}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 ${
              step === "work" ? "bg-wt-surface-3 text-wt-text" : "text-wt-text-muted"
            }`}
          >
            Work
          </span>
          <span
            className={`rounded-full px-2.5 py-1 ${
              step === "personal" ? "bg-wt-surface-3 text-wt-text" : "text-wt-text-muted"
            }`}
          >
            Personal
          </span>
        </div>
      </div>

      {step === "work" ? (
        <div key={`${formKey}-work`} className="grid sm:grid-cols-2 gap-3">
          <InputField
            label="Employee ID"
            required
            value={form.emp_id}
            onChange={(v) => setForm((p) => ({ ...p, emp_id: v }))}
          />
          <InputField
            label="Work email"
            type="email"
            required
            value={form.email}
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
          />
          <InputField
            label="Name"
            required
            value={form.name}
            onChange={(v) => setForm((p) => ({ ...p, name: v }))}
          />
          <SelectField
            label="User Type"
            required
            placeholder="Select"
            value={form.user_type}
            options={options.user_types}
            onChange={(v) =>
              setForm((p) => {
                const ut = v as "FULLTIME" | "INTERN" | "CONSULTANT";
                if (ut === "INTERN") {
                  return { ...p, user_type: ut, band_id: internBandId, role: "" };
                }
                return { ...p, user_type: ut, role: ut === "CONSULTANT" ? p.role : "" };
              })
            }
          />
          <SelectField
            label="Department"
            required
            placeholder="Select"
            value={form.department}
            options={options.departments}
            onChange={(v) =>
              setForm((p) => ({
                ...p,
                department: v,
                band_id: 0,
                role: "",
              }))
            }
          />
          {form.user_type !== "CONSULTANT" ? (
            <SelectField
              label="Band"
              required
              placeholder={
                !form.department.trim()
                  ? "Select department first"
                  : bandOptions.length
                    ? "Select"
                    : "No bands available"
              }
              value={form.band_id ? String(form.band_id) : ""}
              disabled={form.user_type === "INTERN" || !form.department.trim() || !bandOptions.length}
              options={bandOptions}
              onChange={(v) =>
                setForm((p) => ({
                  ...p,
                  band_id: Number(v) || 0,
                  role: "",
                }))
              }
            />
          ) : null}
          {form.user_type === "CONSULTANT" ? (
            <InputField
              label="Designation"
              required
              value={form.role}
              onChange={(v) => setForm((p) => ({ ...p, role: v }))}
            />
          ) : (
            <SelectField
              label="Designation"
              required
              value={form.role}
              placeholder={
                !form.department.trim() || !form.band_id
                  ? "Select band and department first"
                  : designationLoading
                    ? "Loading designations…"
                    : designationOptions.length
                      ? "Select"
                      : "No designations for this band"
              }
              disabled={
                !form.department.trim() || !form.band_id || designationLoading || !designationOptions.length
              }
              options={designationOptions}
              onChange={(role) => setForm((p) => ({ ...p, role }))}
            />
          )}
          <SelectField
            label="Work Mode"
            required
            placeholder="Select"
            value={form.work_mode}
            options={options.work_modes}
            onChange={(v) => setForm((p) => ({ ...p, work_mode: v }))}
          />
          <SelectField
            label="Work Location"
            required
            placeholder="Select"
            value={form.work_location_type}
            options={options.work_location_types}
            onChange={(v) => setForm((p) => ({ ...p, work_location_type: v }))}
          />
          <SelectField
            label="Category"
            required
            placeholder="Select"
            value={form.category}
            options={options.categories}
            onChange={(v) => setForm((p) => ({ ...p, category: v }))}
          />
          <SelectField
            label="Holiday Calendar"
            placeholder="Optional"
            value={form.holiday_calendar_id}
            options={[{ value: "", label: "None" }, ...options.holiday_calendars]}
            onChange={(v) => setForm((p) => ({ ...p, holiday_calendar_id: v }))}
          />
          {form.user_type === "INTERN" ? (
            <>
              <InputField
                label="Date of Internship"
                required
                value={form.doi}
                onChange={(v) => setForm((p) => ({ ...p, doi: v }))}
                type="date"
              />
              <InputField
                label="Internship Duration (months)"
                required
                value={form.internship_duration}
                onChange={(v) => setForm((p) => ({ ...p, internship_duration: v }))}
              />
            </>
          ) : (
            <InputField
              label="Date of Joining"
              required
              value={form.doj}
              onChange={(v) => setForm((p) => ({ ...p, doj: v }))}
              type="date"
            />
          )}
        </div>
      ) : (
        <div key={`${formKey}-personal`} className="space-y-3">
          <p className="text-xs text-wt-text-muted">
            Personal fields are optional. Employees can complete these during self-service onboarding.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <InputField
              label="Personal mail ID"
              type="email"
              value={form.personal_email}
              onChange={(v) => setForm((p) => ({ ...p, personal_email: v }))}
            />
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
            <InputField
              label="Phone Number"
              value={form.phone_number}
              onChange={(v) => setForm((p) => ({ ...p, phone_number: v }))}
            />
            <InputField
              label="Date of Birth"
              value={form.date_of_birth}
              onChange={(v) => setForm((p) => ({ ...p, date_of_birth: v }))}
              type="date"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {step === "personal" ? (
          <button
            type="button"
            className="btn-ghost px-3 py-2"
            disabled={actionLoading}
            onClick={() => setStep("work")}
          >
            Back
          </button>
        ) : null}
        {step === "work" ? (
          <>
            <button type="button" className="btn-primary px-3 py-2" disabled={actionLoading} onClick={goNext}>
              Next
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-2"
              disabled={actionLoading}
              onClick={() => submit(false)}
            >
              Create employee
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn-primary px-3 py-2"
            disabled={actionLoading}
            onClick={() => submit(true)}
          >
            Create employee
          </button>
        )}
      </div>
    </div>
  );
}
