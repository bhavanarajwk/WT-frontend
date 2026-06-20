"use client";

import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { hrmsService } from "@/services/hrms.service";
import { DatePickerField, DropdownSelectField, InputField } from "@/components/dashboard/ui/forms";
import { isValidPersonName } from "@/utils/dashboard/validation";
import {
  bandSelectOptions,
  bandsForDepartment,
  resolveInternBandId,
} from "@/utils/dashboard/validation";
import { parseDesignationList } from "@/utils/masters";
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
  optionsLoading?: boolean;
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
  const reportingManagerId = Number(form.reporting_manager_id);

  if (!empId) throw new Error("Employee ID is required.");
  if (empId.length > 50) throw new Error("Employee ID must be at most 50 characters.");
  if (!email || !name) throw new Error("Work Email and Name are required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid Work Email.");
  }
  if (!form.user_type) throw new Error("User Type is required.");
  if (!department) throw new Error("Department is required.");
  if (!role) throw new Error("Designation is required.");
  if (!form.work_mode) throw new Error("Work Mode is required.");
  if (!form.work_location_type) throw new Error("Work Location is required.");
  if (!form.category) throw new Error("Category is required.");
  if (!Number.isFinite(reportingManagerId) || reportingManagerId <= 0) {
    throw new Error("Reporting Manager is required.");
  }
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
    throw new Error("Please select a valid Band.");
  }

  if (form.user_type === "INTERN") {
    if (!form.doi.trim()) throw new Error("Date of Internship is required for interns.");
    if (!form.internship_duration.trim()) {
      throw new Error("Internship Duration is required for interns.");
    }
  } else if (!form.doj.trim()) {
    throw new Error("Date of Joining is required.");
  }

  return { empId, email, name, department, role, bandId, reportingManagerId };
}

export function HrOnboardForm({
  formKey,
  form,
  setForm,
  options,
  bands,
  actionLoading,
  optionsLoading = false,
  onSubmitSuccess,
  onError,
  runAction,
}: HrOnboardFormProps) {
  const internBandId = useMemo(() => resolveInternBandId(bands), [bands]);
  const defaultConsultantBandId = useMemo(() => {
    const first = bands[0];
    const id = first?.id != null ? Number(first.id) : NaN;
    return Number.isFinite(id) && id > 0 ? id : 0;
  }, [bands]);

  const departmentBands = useMemo(
    () => bandsForDepartment(bands, form.department),
    [bands, form.department]
  );
  const bandOptions = useMemo(() => bandSelectOptions(departmentBands), [departmentBands]);

  const designationBandId = useMemo(() => {
    if (form.user_type === "CONSULTANT") return defaultConsultantBandId;
    if (form.user_type === "INTERN") return internBandId;
    return Number(form.band_id);
  }, [defaultConsultantBandId, form.band_id, form.user_type, internBandId]);

  const department = form.department.trim();
  const designationsQ = useQuery({
    queryKey: ["masters", "designations", department, designationBandId],
    enabled: designationBandId > 0 && Boolean(department),
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const res = await hrmsService.searchDesignations({
        band_id: designationBandId,
        department,
      });
      return parseDesignationList(res).map((item) => ({
        value: item.name,
        label: item.name,
      }));
    },
  });

  const designationOptions = designationsQ.data ?? [];
  const designationLoading = designationsQ.isLoading || designationsQ.isFetching;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!designationsQ.isError) return;
    onErrorRef.current(
      designationsQ.error instanceof Error
        ? designationsQ.error.message
        : "Could not load designations for this band."
    );
  }, [designationsQ.isError, designationsQ.error]);

  useEffect(() => {
    if (form.user_type !== "INTERN") return;
    setForm((prev) => (prev.band_id === internBandId ? prev : { ...prev, band_id: internBandId }));
  }, [form.user_type, internBandId, setForm]);

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
    if (designationOptions.length !== 1) return;
    const onlyRole = designationOptions[0]?.value ?? "";
    if (!onlyRole) return;
    setForm((prev) => (prev.role === onlyRole ? prev : { ...prev, role: onlyRole }));
  }, [designationOptions, setForm]);

  function submit() {
    void runAction("Create And Invite Employee", async () => {
      const { empId, email, name, department, role, bandId, reportingManagerId } = validateWorkStep(
        form,
        internBandId,
        defaultConsultantBandId
      );

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
        reporting_manager_id: reportingManagerId,
        ...(form.holiday_calendar_id.trim()
          ? { holiday_calendar_id: Number(form.holiday_calendar_id) }
          : {}),
      };
      if (form.holiday_calendar_id.trim()) {
        const calendarId = Number(form.holiday_calendar_id.trim());
        if (Number.isFinite(calendarId) && calendarId > 0) {
          basePayload.holiday_calendar_id = calendarId;
        }
      }

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

      await onSubmitSuccess();
    });
  }

  return (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5">
      <div className="mb-4 space-y-1">
        <h3 className="font-semibold">Work Information</h3>
        <p className="text-sm text-wt-text-muted">
          Complete the required work fields to create and invite the employee. They will complete
          personal details during self-service onboarding.
        </p>
      </div>

      <div key={`${formKey}-work`} className="grid gap-3 sm:grid-cols-2">
        <InputField
          label="Employee ID"
          required
          value={form.emp_id}
          onChange={(v) => setForm((p) => ({ ...p, emp_id: v }))}
        />
        <InputField
          label="Work Email"
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
        <DropdownSelectField
          label="User Type"
          required
          placeholder="Select"
          value={form.user_type}
          loading={optionsLoading}
          loadingLabel="Loading options…"
          options={options.user_types}
          onChange={(v) =>
            setForm((p) => {
              const ut = v as "FULLTIME" | "INTERN" | "CONSULTANT";
              if (ut === "INTERN") {
                return { ...p, user_type: ut, band_id: internBandId, role: "" };
              }
              return { ...p, user_type: ut, role: "" };
            })
          }
        />
        <DropdownSelectField
          label="Department"
          required
          placeholder="Select"
          value={form.department}
          loading={optionsLoading}
          loadingLabel="Loading options…"
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
          <DropdownSelectField
            label="Band"
            required
            placeholder={
              optionsLoading
                ? "Loading bands…"
                : !form.department.trim()
                  ? "Select Department First"
                  : bandOptions.length
                    ? "Select"
                    : "No Bands Available"
            }
            value={form.band_id ? String(form.band_id) : ""}
            loading={optionsLoading}
            loadingLabel="Loading bands…"
            disabled={form.user_type === "INTERN" || !form.department.trim() || (!optionsLoading && !bandOptions.length)}
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
        <DropdownSelectField
          label="Designation"
          required
          value={form.role}
          loading={designationLoading}
          loadingLabel="Loading designations…"
          placeholder={
            !form.department.trim() || designationBandId <= 0
              ? "Select Department And Band First"
              : designationLoading
                ? "Loading Designations…"
                : designationOptions.length
                  ? "Select"
                  : "No Designations For This Band"
          }
          disabled={
            !form.department.trim() ||
            designationBandId <= 0 ||
            designationLoading ||
            !designationOptions.length
          }
          options={designationOptions}
          onChange={(role) => setForm((p) => ({ ...p, role }))}
        />
        <DropdownSelectField
          label="Work Mode"
          required
          placeholder="Select"
          value={form.work_mode}
          loading={optionsLoading}
          loadingLabel="Loading options…"
          options={options.work_modes}
          onChange={(v) => setForm((p) => ({ ...p, work_mode: v }))}
        />
        <DropdownSelectField
          label="Work Location"
          required
          placeholder="Select"
          value={form.work_location_type}
          loading={optionsLoading}
          loadingLabel="Loading options…"
          options={options.work_location_types}
          onChange={(v) => setForm((p) => ({ ...p, work_location_type: v }))}
        />
        <DropdownSelectField
          label="Category"
          required
          placeholder="Select"
          value={form.category}
          loading={optionsLoading}
          loadingLabel="Loading options…"
          options={options.categories}
          onChange={(v) => setForm((p) => ({ ...p, category: v }))}
        />
        <DropdownSelectField
          label="Reporting Manager"
          required
          placeholder={
            optionsLoading
              ? "Loading managers…"
              : options.reporting_managers.length
                ? "Select"
                : "No Employees Available"
          }
          value={form.reporting_manager_id}
          loading={optionsLoading}
          loadingLabel="Loading managers…"
          disabled={!optionsLoading && !options.reporting_managers.length}
          options={options.reporting_managers}
          onChange={(v) => setForm((p) => ({ ...p, reporting_manager_id: v }))}
        />
        {form.user_type === "INTERN" ? (
          <>
            <DatePickerField
              label="Date of Internship"
              required
              value={form.doi}
              onChange={(v) => setForm((p) => ({ ...p, doi: v }))}
            />
            <InputField
              label="Internship Duration (Months)"
              required
              value={form.internship_duration}
              onChange={(v) => setForm((p) => ({ ...p, internship_duration: v }))}
            />
          </>
        ) : (
          <DatePickerField
            label="Date of Joining"
            required
            value={form.doj}
            onChange={(v) => setForm((p) => ({ ...p, doj: v }))}
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="brand" type="button" className="px-3 py-2" disabled={actionLoading} onClick={submit} >
          Create And Invite Employee
        </Button>
      </div>
    </div>
  );
}
